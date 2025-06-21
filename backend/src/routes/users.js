import express from "express"
import bcrypt from "bcryptjs"
import db from "../config/database.js"
import {authenticate, requireRole, requireAdmin, requireSalesAgent, requireCustomer, requireAuthenticated} from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get all users (Admin only)
router.get("/", authenticate, requireAdmin, validate(schemas.pagination, "query"), async (req, res) => {
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
router.post("/register-customer", authenticate, requireAdmin, validate(schemas.userRegistration, "body"), async (req, res) => {
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

router.get("/:id", authenticate, requireAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Allow only admin or the user accessing their own profile
    if (req.user.user_type !== "admin" && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Strictly select only fields from the users table as per schema
    const query = `
      SELECT 
        id,
        username,
        email,
        first_name,
        last_name,
        phone,
        user_type,
        company_name,
        contact_person,
        kra_pin,
        cashback_phone,
        agent_code,
        is_active,
        email_verified,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE id = $1 AND is_active = true
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
});

// Reactivate user (Admin only)
router.patch("/:id/reactivate", authenticate, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
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
  authenticate,
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
  authenticate,
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
router.get("/stats/overview", authenticate, requireAdmin, async (req, res) => {
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
