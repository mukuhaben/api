import express from "express"
import db from "../config/database.js"
import { verifyToken, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get all suppliers (Admin only)
router.get("/", verifyToken, requireAdmin, validate(schemas.pagination, "query"), async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, search } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE s.is_active = true"
    const queryParams = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (s.name ILIKE $${paramCount} OR s.company ILIKE $${paramCount} OR s.email ILIKE $${paramCount} OR s.contact_person ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    const query = `
      SELECT 
        s.*,
        COUNT(po.id) as total_purchase_orders,
        COALESCE(SUM(po.total_amount), 0) as total_purchase_amount
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM suppliers s
      ${whereClause}
    `

    const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        suppliers: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get suppliers error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers",
    })
  }
})

// Get single supplier (Admin only)
router.get("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        s.*,
        COUNT(po.id) as total_purchase_orders,
        COALESCE(SUM(po.total_amount), 0) as total_purchase_amount,
        COALESCE(SUM(CASE WHEN po.status = 'pending' THEN po.total_amount ELSE 0 END), 0) as pending_amount
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.id = $1 AND s.is_active = true
      GROUP BY s.id
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    res.json({
      success: true,
      data: {
        supplier: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Get supplier error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch supplier",
    })
  }
})

// Create new supplier (Admin only)
router.post("/", verifyToken, requireAdmin, validate(schemas.supplierCreation), async (req, res) => {
  try {
    const {
      name,
      company,
      contactPerson,
      email,
      phone,
      address,
      city,
      region,
      country,
      postalCode,
      kraPin,
      paymentTerms,
      creditLimit,
    } = req.body

    const result = await db.query(
      `
      INSERT INTO suppliers (
        name, company, contact_person, email, phone, address,
        city, region, country, postal_code, kra_pin, payment_terms, credit_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, name, company
    `,
      [
        name,
        company,
        contactPerson,
        email,
        phone,
        address,
        city,
        region,
        country || "Kenya",
        postalCode,
        kraPin,
        paymentTerms,
        creditLimit || 0,
      ],
    )

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: {
        supplier: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Create supplier error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create supplier",
    })
  }
})

// Update supplier (Admin only)
router.put("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if supplier exists
    const existingSupplier = await db.query("SELECT id FROM suppliers WHERE id = $1", [id])

    if (existingSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    // Build dynamic update query
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    const allowedFields = [
      "name",
      "company",
      "contact_person",
      "email",
      "phone",
      "address",
      "city",
      "region",
      "country",
      "postal_code",
      "kra_pin",
      "payment_terms",
      "credit_limit",
      "current_balance",
      "is_active",
    ]

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase()
      if (allowedFields.includes(dbField)) {
        paramCount++
        updateFields.push(`${dbField} = $${paramCount}`)
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
      UPDATE suppliers 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount + 1}
      RETURNING id, name, company
    `

    const result = await db.query(updateQuery, updateValues)

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: {
        supplier: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Update supplier error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update supplier",
    })
  }
})

// Delete supplier (Admin only)
router.delete("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    // Check if supplier has purchase orders
    const poCheck = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = $1", [id])

    if (Number.parseInt(poCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete supplier with existing purchase orders",
      })
    }

    // Soft delete - set is_active to false
    const result = await db.query(
      "UPDATE suppliers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      })
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    })
  } catch (error) {
    console.error("Delete supplier error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete supplier",
    })
  }
})

// Get supplier purchase orders (Admin only)
router.get(
  "/:id/purchase-orders",
  verifyToken,
  requireAdmin,
  validate(schemas.uuidParam, "params"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { page = 1, limit = 10 } = req.query
      const offset = (page - 1) * limit

      // Verify supplier exists
      const supplierResult = await db.query("SELECT id, name FROM suppliers WHERE id = $1 AND is_active = true", [id])

      if (supplierResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        })
      }

      const query = `
      SELECT 
        po.*,
        COUNT(poi.id) as item_count
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.supplier_id = $1
      GROUP BY po.id
      ORDER BY po.created_at DESC
      LIMIT $2 OFFSET $3
    `

      const result = await db.query(query, [id, limit, offset])

      // Get total count
      const countResult = await db.query("SELECT COUNT(*) as total FROM purchase_orders WHERE supplier_id = $1", [id])

      const total = Number.parseInt(countResult.rows[0].total)

      res.json({
        success: true,
        data: {
          supplier: supplierResult.rows[0],
          purchaseOrders: result.rows,
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      })
    } catch (error) {
      console.error("Get supplier purchase orders error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch supplier purchase orders",
      })
    }
  },
)

export default router
