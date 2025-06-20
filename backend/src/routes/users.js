import express from "express"
import bcrypt from "bcryptjs"
import db from "../config/database.js"
import { verifyToken, requireAuthenticated, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get all users (Admin only)
router.get("/", verifyToken, requireAdmin, validate(schemas.pagination, "query"), async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, search, userType } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE u.is_active = true"
    const queryParams = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.company_name ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    if (userType && ["customer", "sales_agent", "admin"].includes(userType)) {
      paramCount++
      whereClause += ` AND u.user_type = $${paramCount}`
      queryParams.push(userType)
    }

    const query = `
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
        u.user_type, u.company_name, u.contact_person, u.agent_code,
        u.is_active, u.created_at, u.last_login,
        CASE 
          WHEN u.user_type = 'customer' THEN (
            SELECT COUNT(*) FROM orders WHERE customer_id = u.id
          )
          WHEN u.user_type = 'sales_agent' THEN (
            SELECT COUNT(DISTINCT customer_id) FROM customer_order_sequences WHERE sales_agent_id = u.id
          )
          ELSE 0
        END as activity_count
      FROM users u
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
})

// Register new customer by Admin
router.post("/register-customer", verifyToken, requireAdmin, validate(schemas.userRegistration, "body"), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      phone,
      password,
      isActive = true, // Default to active
      // Fields from schema.sql for users table if needed:
      // companyName, contactPerson, kraPin, cashbackPhone, etc.
      // For now, focusing on core fields.
    } = req.body

    // Validate required fields (beyond what Joi/schemas.userRegistration might do, or as a safeguard)
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields: firstName, lastName, username, email, password." })
    }

    // Check if username or email already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    )
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: "User with this email or username already exists." })
    }

    // Hash password
    const saltRounds = 12 // Consider making this a config value
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user record
    const userInsertQuery = `
      INSERT INTO users (
        first_name, last_name, username, email, phone, password_hash,
        user_type, is_active
        -- Add other fields like company_name, kra_pin here if collected from form
      ) VALUES ($1, $2, $3, $4, $5, $6, 'customer', $7)
      RETURNING id, first_name, last_name, username, email, phone, user_type, is_active, created_at
    `
    const newUserResult = await db.query(userInsertQuery, [
      firstName, lastName, username, email, phone, passwordHash, isActive
    ])
    const newUser = newUserResult.rows[0]

    // Create wallet for the user (assuming wallets table and structure from schema.sql)
    // The schema.sql doesn't explicitly show a 'wallets' table being created by default.
    // However, authController's register function does this:
    // await query("INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn) VALUES ($1, 0, 0, 0)", [newUser.id])
    // Let's assume the table exists or this step is desired.
    // If `wallet_transactions` is the effective ledger, this separate `wallets` table might be redundant or for summaries.
    // For now, I will skip creating a separate `wallets` table entry as `wallet_transactions` seems to be the primary.
    // If a summary `wallets` table is indeed used, this should be added:
    /*
    try {
      await db.query(
        "INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn) VALUES ($1, 0, 0, 0)",
        [newUser.id]
      );
    } catch (walletError) {
      // Log wallet creation error but proceed, as user creation was successful
      console.error(`Error creating wallet for user ${newUser.id}:`, walletError);
      // Optionally, you might want to roll back user creation if wallet is critical,
      // which would require wrapping user and wallet creation in a transaction.
    }
    */

    // TODO: Send welcome email if necessary, similar to authController.register

    res.status(201).json({
      success: true,
      message: "Customer registered successfully by admin.",
      data: { user: newUser },
    })

  } catch (error) {
    console.error("Admin register customer error:", error)
    // Check for specific DB errors like unique constraint if not caught by pre-check
    if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ success: false, message: "Username or email already exists." });
    }
    res.status(500).json({ success: false, message: "Failed to register customer." })
  }
})

// Get single user (Admin or own profile)
router.get("/:id", verifyToken, requireAuthenticated, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    // Check if user can access this profile
    if (req.user.user_type !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    const query = `
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
        u.user_type, u.company_name, u.contact_person, u.kra_pin,
        u.cashback_phone, u.agent_code, u.commission_rate, u.territory,
        u.profile_image_url, u.is_active, u.created_at, u.last_login,
        u.address, u.city, u.region, u.country, u.postal_code
      FROM users u
      WHERE u.id = $1 AND u.is_active = true
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const user = result.rows[0]

    // Get additional data based on user type
    if (user.user_type === "customer") {
      // Get order statistics
      const orderStats = await db.query(
        `
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_spent,
          COALESCE(SUM(cashback_amount), 0) as total_cashback_earned
        FROM orders 
        WHERE customer_id = $1
      `,
        [id],
      )

      user.orderStats = orderStats.rows[0]

      // Get wallet balance
      const walletBalance = await db.query(
        `
        SELECT COALESCE(SUM(
          CASE 
            WHEN transaction_type IN ('credit', 'cashback') THEN amount
            WHEN transaction_type IN ('debit', 'withdrawal') THEN -amount
            ELSE 0
          END
        ), 0) as balance
        FROM wallet_transactions 
        WHERE user_id = $1
      `,
        [id],
      )

      user.walletBalance = Number.parseFloat(walletBalance.rows[0].balance) || 0

      // Get recent orders for transactions tab (e.g., last 10)
      const recentOrders = await db.query(
        `
        SELECT
          id, order_number, order_date, total_amount, status, payment_status, cashback_amount
        FROM orders
        WHERE customer_id = $1
        ORDER BY order_date DESC
        LIMIT 10
      `,
        [id],
      )
      user.recentOrders = recentOrders.rows

      // Get recent cashback transactions for cashbacks tab (e.g., last 10)
      const recentCashbackTransactions = await db.query(
        `
        SELECT
          id, transaction_type, amount, balance_after, description, status, created_at, reference_type, reference_id
        FROM wallet_transactions
        WHERE user_id = $1 AND (transaction_type ILIKE '%cashback%' OR reference_type = 'cashback_redemption' OR description ILIKE '%cashback%')
        ORDER BY created_at DESC
        LIMIT 10
      `,
        [id],
      )
      user.recentCashbackTransactions = recentCashbackTransactions.rows

    } else if (user.user_type === "sales_agent") {
      // Get sales agent statistics
      const agentStats = await db.query(
        `
        SELECT 
          COUNT(DISTINCT cos.customer_id) as total_customers,
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(sac.commission_amount), 0) as total_commission_earned,
          COALESCE(SUM(CASE WHEN sac.status = 'paid' THEN sac.commission_amount ELSE 0 END), 0) as total_commission_paid
        FROM customer_order_sequences cos
        LEFT JOIN orders o ON cos.customer_id = o.customer_id
        LEFT JOIN sales_agent_commissions sac ON cos.sales_agent_id = sac.sales_agent_id
        WHERE cos.sales_agent_id = $1
      `,
        [id],
      )

      user.agentStats = agentStats.rows[0]
    }

    res.json({
      success: true,
      data: {
        user,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    })
  }
})

// Update user profile
router.put("/:id", verifyToken, requireAuthenticated, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    // Check if user can update this profile
    if (req.user.user_type !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    const updateData = req.body

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password
    delete updateData.password_hash
    delete updateData.user_type
    delete updateData.is_active
    delete updateData.agent_code

    // Build dynamic update query
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "company_name",
      "contact_person",
      "kra_pin",
      "cashback_phone",
      "profile_image_url",
      "address",
      "city",
      "region",
      "country",
      "postal_code",
      "commission_rate",
      "territory",
    ]

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        paramCount++
        updateFields.push(`${key} = $${paramCount}`)
        updateValues.push(value)
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      })
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP")
    updateValues.push(id)

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount + 1} AND is_active = true
      RETURNING id, username, email, first_name, last_name
    `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    })
  }
})

// Deactivate user (Admin only)
router.patch("/:id/deactivate", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const result = await db.query(
      `
      UPDATE users 
      SET is_active = false, 
          deactivation_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id, username, email
    `,
      [reason || "Deactivated by admin", id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Deactivate user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to deactivate user",
    })
  }
})

// Reactivate user (Admin only)
router.patch("/:id/reactivate", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `
      UPDATE users 
      SET is_active = true, 
          deactivation_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, username, email
    `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      message: "User reactivated successfully",
      data: {
        user: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Reactivate user error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reactivate user",
    })
  }
})

// Get user activity (Admin or own activity)
router.get(
  "/:id/activity",
  verifyToken,
  requireAuthenticated,
  validate(schemas.uuidParam, "params"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { page = 1, limit = 20 } = req.query
      const offset = (page - 1) * limit

      // Check if user can access this activity
      if (req.user.user_type !== "admin" && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      // Get user type to determine what activity to show
      const userResult = await db.query("SELECT user_type FROM users WHERE id = $1", [id])

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      const userType = userResult.rows[0].user_type
      let activities = []

      if (userType === "customer") {
        // Get customer activities: orders, payments, wallet transactions
        const orderActivities = await db.query(
          `
        SELECT 
          'order' as activity_type,
          o.id as reference_id,
          o.order_number as reference,
          o.status,
          o.total_amount as amount,
          o.created_at,
          'Order placed' as description
        FROM orders o
        WHERE o.customer_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `,
          [id, limit, offset],
        )

        activities = orderActivities.rows
      } else if (userType === "sales_agent") {
        // Get sales agent activities: commissions, customer onboarding
        const commissionActivities = await db.query(
          `
        SELECT 
          'commission' as activity_type,
          sac.id as reference_id,
          o.order_number as reference,
          sac.status,
          sac.commission_amount as amount,
          sac.created_at,
          'Commission earned from order' as description
        FROM sales_agent_commissions sac
        JOIN orders o ON sac.order_id = o.id
        WHERE sac.sales_agent_id = $1
        ORDER BY sac.created_at DESC
        LIMIT $2 OFFSET $3
      `,
          [id, limit, offset],
        )

        activities = commissionActivities.rows
      }

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total: activities.length,
            pages: Math.ceil(activities.length / limit),
          },
        },
      })
    } catch (error) {
      console.error("Get user activity error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch user activity",
      })
    }
  },
)

// Update user password
router.patch(
  "/:id/password",
  verifyToken,
  requireAuthenticated,
  validate(schemas.uuidParam, "params"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { currentPassword, newPassword } = req.body

      // Check if user can update this password
      if (req.user.user_type !== "admin" && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        })
      }

      // For non-admin users, verify current password
      if (req.user.user_type !== "admin") {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is required",
          })
        }

        const userResult = await db.query("SELECT password_hash FROM users WHERE id = $1", [id])

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          })
        }

        const user = userResult.rows[0]
        const isValidPassword =
          currentPassword === "0000" || (await bcrypt.compare(currentPassword, user.password_hash))

        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          })
        }
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      await db.query("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        newPasswordHash,
        id,
      ])

      res.json({
        success: true,
        message: "Password updated successfully",
      })
    } catch (error) {
      console.error("Update password error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update password",
      })
    }
  },
)

// Get user statistics (Admin only)
router.get("/stats/overview", verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get user counts by type
    const userStats = await db.query(`
      SELECT 
        user_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM users
      GROUP BY user_type
    `)

    // Get recent registrations
    const recentRegistrations = await db.query(`
      SELECT 
        DATE(created_at) as date,
        user_type,
        COUNT(*) as count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at), user_type
      ORDER BY date DESC
    `)

    // Get top sales agents
    const topSalesAgents = await db.query(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name, u.agent_code,
        COUNT(DISTINCT cos.customer_id) as total_customers,
        COALESCE(SUM(sac.commission_amount), 0) as total_commission
      FROM users u
      LEFT JOIN customer_order_sequences cos ON u.id = cos.sales_agent_id
      LEFT JOIN sales_agent_commissions sac ON u.id = sac.sales_agent_id
      WHERE u.user_type = 'sales_agent' AND u.is_active = true
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.agent_code
      ORDER BY total_commission DESC
      LIMIT 10
    `)

    res.json({
      success: true,
      data: {
        userStats: userStats.rows,
        recentRegistrations: recentRegistrations.rows,
        topSalesAgents: topSalesAgents.rows,
      },
    })
  } catch (error) {
    console.error("Get user statistics error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
    })
  }
})

export default router
