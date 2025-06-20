// Convert from CommonJS to ESM
import express from "express"
import db from "../config/database.js"
import { verifyToken, requireSalesAgentOrAdmin, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get sales agent dashboard data
router.get("/dashboard", verifyToken, requireSalesAgentOrAdmin, async (req, res) => {
  try {
    const agentId = req.user.user_type === "admin" ? req.query.agentId : req.user.id

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      })
    }

    // Get total customers onboarded
    const customersResult = await db.query(
      `
      SELECT COUNT(DISTINCT customer_id) as total_customers
      FROM customer_order_sequences 
      WHERE sales_agent_id = $1
    `,
      [agentId],
    )

    // Get total orders
    const ordersResult = await db.query(
      `
      SELECT COUNT(*) as total_orders
      FROM orders 
      WHERE sales_agent_id = $1
    `,
      [agentId],
    )

    // Get commission summary
    const commissionResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_commissions,
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as total_pending
      FROM sales_agent_commissions 
      WHERE sales_agent_id = $1
    `,
      [agentId],
    )

    // Get recent customers
    const recentCustomersResult = await db.query(
      `
      SELECT 
        u.id, u.username, u.email, u.company_name,
        cos.order_sequence, cos.last_order_date,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM customer_order_sequences cos
      JOIN users u ON cos.customer_id = u.id
      LEFT JOIN orders o ON cos.customer_id = o.customer_id
      WHERE cos.sales_agent_id = $1
      GROUP BY u.id, u.username, u.email, u.company_name, cos.order_sequence, cos.last_order_date
      ORDER BY cos.last_order_date DESC
      LIMIT 10
    `,
      [agentId],
    )

    // Get recent commissions
    const recentCommissionsResult = await db.query(
      `
      SELECT 
        sac.*,
        u.username as customer_name,
        o.order_number
      FROM sales_agent_commissions sac
      JOIN users u ON sac.customer_id = u.id
      JOIN orders o ON sac.order_id = o.id
      WHERE sac.sales_agent_id = $1
      ORDER BY sac.created_at DESC
      LIMIT 10
    `,
      [agentId],
    )

    const totalCustomers = Number.parseInt(customersResult.rows[0].total_customers) || 0
    const totalOrders = Number.parseInt(ordersResult.rows[0].total_orders) || 0
    const commission = commissionResult.rows[0]

    res.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          totalOrders,
          totalCommissionEarned: Number.parseFloat(commission.total_earned) || 0,
          totalCommissionPaid: Number.parseFloat(commission.total_paid) || 0,
          pendingCommission: Number.parseFloat(commission.total_pending) || 0,
        },
        recentCustomers: recentCustomersResult.rows,
        recentCommissions: recentCommissionsResult.rows,
      },
    })
  } catch (error) {
    console.error("Get sales agent dashboard error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    })
  }
})

// Get sales agent customers
router.get("/customers", verifyToken, requireSalesAgentOrAdmin, async (req, res) => {
  try {
    const agentId = req.user.user_type === "admin" ? req.query.agentId : req.user.id
    const { page = 1, limit = 10, search } = req.query
    const offset = (page - 1) * limit

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      })
    }

    let whereClause = "WHERE cos.sales_agent_id = $1"
    const queryParams = [agentId]
    let paramCount = 1

    if (search) {
      paramCount++
      whereClause += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.company_name ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    const query = `
      SELECT 
        u.id, u.username, u.email, u.phone, u.company_name, u.contact_person,
        cos.order_sequence, cos.last_order_date, cos.created_at as onboarded_date,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(SUM(sac.commission_amount), 0) as total_commission_earned
      FROM customer_order_sequences cos
      JOIN users u ON cos.customer_id = u.id
      LEFT JOIN orders o ON cos.customer_id = o.customer_id
      LEFT JOIN sales_agent_commissions sac ON cos.customer_id = sac.customer_id AND sac.sales_agent_id = cos.sales_agent_id
      ${whereClause}
      GROUP BY u.id, u.username, u.email, u.phone, u.company_name, u.contact_person, 
               cos.order_sequence, cos.last_order_date, cos.created_at
      ORDER BY cos.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM customer_order_sequences cos
      JOIN users u ON cos.customer_id = u.id
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        customers: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get sales agent customers error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    })
  }
})

// Get sales agent commissions
router.get("/commissions", verifyToken, requireSalesAgentOrAdmin, async (req, res) => {
  try {
    const agentId = req.user.user_type === "admin" ? req.query.agentId : req.user.id
    const { page = 1, limit = 10, status } = req.query
    const offset = (page - 1) * limit

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required",
      })
    }

    let whereClause = "WHERE sac.sales_agent_id = $1"
    const queryParams = [agentId]
    let paramCount = 1

    if (status && ["pending", "paid", "cancelled"].includes(status)) {
      paramCount++
      whereClause += ` AND sac.status = $${paramCount}`
      queryParams.push(status)
    }

    const query = `
      SELECT 
        sac.*,
        u.username as customer_name,
        u.email as customer_email,
        u.company_name,
        o.order_number,
        o.order_date
      FROM sales_agent_commissions sac
      JOIN users u ON sac.customer_id = u.id
      JOIN orders o ON sac.order_id = o.id
      ${whereClause}
      ORDER BY sac.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count and summary
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(commission_amount), 0) as total_amount
      FROM sales_agent_commissions sac
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
    const { total, total_amount } = countResult.rows[0]

    res.json({
      success: true,
      data: {
        commissions: result.rows,
        summary: {
          totalCommissions: Number.parseInt(total),
          totalAmount: Number.parseFloat(total_amount) || 0,
        },
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: Number.parseInt(total),
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get sales agent commissions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch commissions",
    })
  }
})

// Add customer to sales agent (Sales Agent only)
router.post("/customers", verifyToken, requireSalesAgentOrAdmin, async (req, res) => {
  try {
    const agentId = req.user.id
    const { customerId } = req.body

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      })
    }

    // Verify customer exists and is not already assigned to this agent
    const customerResult = await db.query("SELECT id, username FROM users WHERE id = $1 AND user_type = $2", [
      customerId,
      "customer",
    ])

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      })
    }

    // Check if customer is already assigned to this agent
    const existingAssignment = await db.query(
      "SELECT id FROM customer_order_sequences WHERE customer_id = $1 AND sales_agent_id = $2",
      [customerId, agentId],
    )

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Customer is already assigned to this sales agent",
      })
    }

    // Create customer-agent relationship
    await db.query(
      `
      INSERT INTO customer_order_sequences (customer_id, sales_agent_id, order_sequence)
      VALUES ($1, $2, 1)
    `,
      [customerId, agentId],
    )

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      data: {
        customer: customerResult.rows[0],
      },
    })
  } catch (error) {
    console.error("Add customer to sales agent error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add customer",
    })
  }
})

// Get all sales agents (Admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE u.user_type = $1 AND u.is_active = true"
    const queryParams = ["sales_agent"]
    let paramCount = 1

    if (search) {
      paramCount++
      whereClause += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    const query = `
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
        u.agent_code, u.commission_rate, u.territory, u.created_at,
        COUNT(DISTINCT cos.customer_id) as total_customers,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(sac.commission_amount), 0) as total_commission_earned
      FROM users u
      LEFT JOIN customer_order_sequences cos ON u.id = cos.sales_agent_id
      LEFT JOIN orders o ON u.id = o.sales_agent_id
      LEFT JOIN sales_agent_commissions sac ON u.id = sac.sales_agent_id
      ${whereClause}
      GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
               u.agent_code, u.commission_rate, u.territory, u.created_at
      ORDER BY u.created_at DESC
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
        salesAgents: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get sales agents error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales agents",
    })
  }
})

// Update commission status (Admin only)
router.patch(
  "/commissions/:id/status",
  verifyToken,
  requireAdmin,
  validate(schemas.uuidParam, "params"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!["pending", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        })
      }

      const updateFields = ["status = $1", "updated_at = CURRENT_TIMESTAMP"]
      const updateValues = [status]

      if (status === "paid") {
        updateFields.push("paid_at = CURRENT_TIMESTAMP")
      }

      updateValues.push(id)

      const result = await db.query(
        `
      UPDATE sales_agent_commissions 
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length}
      RETURNING id, commission_amount, status
    `,
        updateValues,
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Commission not found",
        })
      }

      res.json({
        success: true,
        message: "Commission status updated successfully",
        data: {
          commission: result.rows[0],
        },
      })
    } catch (error) {
      console.error("Update commission status error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update commission status",
      })
    }
  },
)

export default router
