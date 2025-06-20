import express from "express"
import db from "../config/database.js"
import { verifyToken, requireAuthenticated, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `FCL${timestamp}${random}`
}

// Calculate order pricing
const calculateOrderPricing = async (items) => {
  let subtotal = 0
  let totalCashback = 0
  const orderItems = []

  for (const item of items) {
    // Get product and pricing
    const productQuery = `
      SELECT 
        p.id, p.product_name, p.cashback_rate, p.vat_rate, p.stock_units,
        pt.selling_price, pt.tier_name
      FROM products p
      JOIN product_pricing_tiers pt ON p.id = pt.product_id
      WHERE p.id = $1 
        AND p.is_active = true
        AND pt.min_quantity <= $2 
        AND (pt.max_quantity IS NULL OR pt.max_quantity >= $2)
      ORDER BY pt.min_quantity DESC
      LIMIT 1
    `

    const productResult = await db.query(productQuery, [item.productId, item.quantity])

    if (productResult.rows.length === 0) {
      throw new Error(`Product not found or invalid quantity for product ${item.productId}`)
    }

    const product = productResult.rows[0]

    // Check stock availability
    if (product.stock_units < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.product_name}. Available: ${product.stock_units}, Requested: ${item.quantity}`,
      )
    }

    const unitPrice = product.selling_price
    const totalPrice = unitPrice * item.quantity
    const priceExclVat = totalPrice / (1 + product.vat_rate / 100)
    const cashbackAmount = (priceExclVat * product.cashback_rate) / 100

    subtotal += priceExclVat
    totalCashback += cashbackAmount

    orderItems.push({
      productId: product.id,
      productName: product.product_name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      cashbackAmount: Math.round(cashbackAmount * 100) / 100,
    })
  }

  const vatAmount = subtotal * 0.16 // 16% VAT
  const total = subtotal + vatAmount

  return {
    orderItems,
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    totalCashback: Math.round(totalCashback * 100) / 100,
  }
}

// Create new order
router.post("/", verifyToken, requireAuthenticated, validate(schemas.orderCreation), async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, notes } = req.body
    const customerId = req.user.id

    // Calculate pricing
    const pricing = await calculateOrderPricing(items)

    // Start transaction
    const result = await db.transaction(async (client) => {
      // Generate order number
      const orderNumber = generateOrderNumber()

      // Get or create customer order sequence for sales agent commission calculation
      let salesAgentId = null
      let orderSequence = 1

      // Check if customer was onboarded by a sales agent
      const agentQuery = `
        SELECT sales_agent_id, order_sequence + 1 as next_sequence
        FROM customer_order_sequences 
        WHERE customer_id = $1
        ORDER BY last_order_date DESC
        LIMIT 1
      `

      const agentResult = await client.query(agentQuery, [customerId])

      if (agentResult.rows.length > 0) {
        salesAgentId = agentResult.rows[0].sales_agent_id
        orderSequence = agentResult.rows[0].next_sequence
      }

      // Create order
      const orderResult = await client.query(
        `
        INSERT INTO orders (
          order_number, customer_id, sales_agent_id, status, payment_status,
          subtotal, tax_amount, total_amount, cashback_amount,
          shipping_address, billing_address, notes
        ) VALUES ($1, $2, $3, 'pending', 'pending', $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
        [
          orderNumber,
          customerId,
          salesAgentId,
          pricing.subtotal,
          pricing.vatAmount,
          pricing.total,
          pricing.totalCashback,
          JSON.stringify(shippingAddress),
          JSON.stringify(billingAddress || shippingAddress),
          notes,
        ],
      )

      const orderId = orderResult.rows[0].id

      // Create order items and update stock
      for (const item of pricing.orderItems) {
        // Insert order item
        await client.query(
          `
          INSERT INTO order_items (
            order_id, product_id, quantity, unit_price, total_price, cashback_amount
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [orderId, item.productId, item.quantity, item.unitPrice, item.totalPrice, item.cashbackAmount],
        )

        // Update product stock
        await client.query("UPDATE products SET stock_units = stock_units - $1 WHERE id = $2", [
          item.quantity,
          item.productId,
        ])

        // Record inventory movement
        await client.query(
          `
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reference_type, reference_id, created_by
          ) VALUES ($1, 'out', $2, 'order', $3, $4)
        `,
          [item.productId, -item.quantity, orderId, customerId],
        )
      }

      // Update customer order sequence
      if (salesAgentId) {
        await client.query(
          `
          INSERT INTO customer_order_sequences (customer_id, sales_agent_id, order_sequence, last_order_date)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (customer_id, sales_agent_id)
          DO UPDATE SET 
            order_sequence = $3,
            last_order_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
          [customerId, salesAgentId, orderSequence],
        )

        // Calculate and record sales agent commission
        const commissionRates = {
          1: 6, // 6% for 1st order
          2: 4, // 4% for 2nd order
          3: 3, // 3% for 3rd order
          4: 2, // 2% for 4th order
        }

        const commissionRate = commissionRates[orderSequence] || 0

        if (commissionRate > 0) {
          const commissionAmount = (pricing.subtotal * commissionRate) / 100

          await client.query(
            `
            INSERT INTO sales_agent_commissions (
              sales_agent_id, customer_id, order_id, order_sequence,
              commission_rate, order_amount, commission_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              salesAgentId,
              customerId,
              orderId,
              orderSequence,
              commissionRate,
              pricing.subtotal,
              Math.round(commissionAmount * 100) / 100,
            ],
          )
        }
      }

      return { orderId, orderNumber }
    })

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        total: pricing.total,
        cashback: pricing.totalCashback,
      },
    })
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create order",
    })
  }
})

// Get user orders
router.get("/my-orders", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    const query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', p.product_name,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price,
              'cashbackAmount', oi.cashback_amount
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await db.query(query, [req.user.id, limit, offset])

    // Get total count
    const countResult = await db.query("SELECT COUNT(*) as total FROM orders WHERE customer_id = $1", [req.user.id])

    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get user orders error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    })
  }
})

// Get single order
router.get("/:id", verifyToken, requireAuthenticated, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    let whereClause = "WHERE o.id = $1"
    const queryParams = [id]

    // Non-admin users can only see their own orders
    if (req.user.user_type !== "admin") {
      whereClause += " AND o.customer_id = $2"
      queryParams.push(req.user.id)
    }

    const query = `
      SELECT 
        o.*,
        u.username as customer_name,
        u.email as customer_email,
        sa.username as sales_agent_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', p.product_name,
              'productCode', p.product_code,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'totalPrice', oi.total_price,
              'cashbackAmount', oi.cashback_amount
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users sa ON o.sales_agent_id = sa.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      ${whereClause}
      GROUP BY o.id, u.username, u.email, sa.username
    `

    const result = await db.query(query, queryParams)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.json({
      success: true,
      data: {
        order: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    })
  }
})

// Update order status (Admin only)
router.patch("/:id/status", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const { status, paymentStatus, trackingNumber, notes } = req.body

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded"]

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      })
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      })
    }

    // Build update query
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    if (status) {
      paramCount++
      updateFields.push(`status = $${paramCount}`)
      updateValues.push(status)

      // Set shipped/delivered dates
      if (status === "shipped") {
        paramCount++
        updateFields.push(`shipped_date = $${paramCount}`)
        updateValues.push(new Date())
      } else if (status === "delivered") {
        paramCount++
        updateFields.push(`delivered_date = $${paramCount}`)
        updateValues.push(new Date())
      }
    }

    if (paymentStatus) {
      paramCount++
      updateFields.push(`payment_status = $${paramCount}`)
      updateValues.push(paymentStatus)
    }

    if (trackingNumber) {
      paramCount++
      updateFields.push(`tracking_number = $${paramCount}`)
      updateValues.push(trackingNumber)
    }

    if (notes) {
      paramCount++
      updateFields.push(`notes = $${paramCount}`)
      updateValues.push(notes)
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
      UPDATE orders 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount + 1}
      RETURNING id
    `

    const result = await db.query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // If payment is confirmed, add cashback to wallet
    if (paymentStatus === "paid") {
      await db.transaction(async (client) => {
        // Get order details
        const orderResult = await client.query("SELECT customer_id, cashback_amount FROM orders WHERE id = $1", [id])

        if (orderResult.rows.length > 0) {
          const { customer_id, cashback_amount } = orderResult.rows[0]

          if (cashback_amount > 0) {
            // Get current wallet balance
            const balanceResult = await client.query(
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
              [customer_id],
            )

            const currentBalance = Number.parseFloat(balanceResult.rows[0].balance) || 0
            const newBalance = currentBalance + cashback_amount

            // Add cashback to wallet
            await client.query(
              `
              INSERT INTO wallet_transactions (
                user_id, transaction_type, amount, balance_before, balance_after,
                reference_type, reference_id, order_id, description
              ) VALUES ($1, 'cashback', $2, $3, $4, 'order', $5, $5, $6)
            `,
              [
                customer_id,
                cashback_amount,
                currentBalance,
                newBalance,
                id,
                `Cashback for order ${result.rows[0].order_number || id}`,
              ],
            )
          }
        }
      })
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    })
  }
})

// Get all orders (Admin only)
router.get("/", verifyToken, requireAdmin, validate(schemas.pagination, "query"), async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, search } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE 1=1"
    const queryParams = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (o.order_number ILIKE $${paramCount} OR u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    const query = `
      SELECT 
        o.*,
        u.username as customer_name,
        u.email as customer_email,
        sa.username as sales_agent_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN users sa ON o.sales_agent_id = sa.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, u.username, u.email, sa.username
      ORDER BY o.${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    })
  }
})

// Cancel order
router.patch(
  "/:id/cancel",
  verifyToken,
  requireAuthenticated,
  validate(schemas.uuidParam, "params"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { reason } = req.body

      // Check if order exists and belongs to user (unless admin)
      let whereClause = "WHERE id = $1"
      const queryParams = [id]

      if (req.user.user_type !== "admin") {
        whereClause += " AND customer_id = $2"
        queryParams.push(req.user.id)
      }

      const orderResult = await db.query(`SELECT id, status, payment_status FROM orders ${whereClause}`, queryParams)

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }

      const order = orderResult.rows[0]

      // Check if order can be cancelled
      if (["shipped", "delivered", "cancelled"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled",
        })
      }

      // Start transaction to cancel order and restore stock
      await db.transaction(async (client) => {
        // Update order status
        await client.query("UPDATE orders SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3", [
          "cancelled",
          reason || "Order cancelled by user",
          id,
        ])

        // Restore stock for order items
        const itemsResult = await client.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1", [id])

        for (const item of itemsResult.rows) {
          // Restore product stock
          await client.query("UPDATE products SET stock_units = stock_units + $1 WHERE id = $2", [
            item.quantity,
            item.product_id,
          ])

          // Record inventory movement
          await client.query(
            `
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reference_type, reference_id, 
            notes, created_by
          ) VALUES ($1, 'in', $2, 'order_cancellation', $3, $4, $5)
        `,
            [item.product_id, item.quantity, id, "Stock restored due to order cancellation", req.user.id],
          )
        }
      })

      res.json({
        success: true,
        message: "Order cancelled successfully",
      })
    } catch (error) {
      console.error("Cancel order error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to cancel order",
      })
    }
  },
)

export default router
