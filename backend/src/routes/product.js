import express from "express"
import { query, transaction } from "../config/database.js"
import { verifyToken, requireAdmin, rateLimit } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"
import ProductController from "../controllers/product.js" // Import ProductController

const router = express.Router()

// Get all products with filtering and pagination
router.get("/", validate(schemas.pagination, "query"), async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "DESC", search } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE p.is_active = true"
    const queryParams = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (p.product_name ILIKE $${paramCount} OR p.product_code ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      queryParams.push(`%${search}%`)
    }

    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pt.id,
              'tierName', pt.tier_name,
              'minQuantity', pt.min_quantity,
              'maxQuantity', pt.max_quantity,
              'sellingPrice', pt.selling_price
            )
          ) FILTER (WHERE pt.id IS NOT NULL), 
          '[]'
        ) as pricing_tiers,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'altText', pi.alt_text,
              'isPrimary', pi.is_primary,
              'sortOrder', pi.sort_order
            ) ORDER BY pi.sort_order, pi.is_primary DESC
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_pricing_tiers pt ON p.id = pt.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      ${whereClause}
      GROUP BY p.id, c.name, sc.name
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await query(productQuery, queryParams)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `

    const countResult = await query(countQuery, queryParams.slice(0, paramCount))
    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    })
  }
})

// Bulk Import Products (Admin only)
router.post("/bulk-import", verifyToken, requireAdmin, async (req, res) => {
  // This controller logic will be moved to controllers/product.js later
  try {
    console.log("Bulk import request body:", req.body)
    res.status(200).json({ message: "Bulk import endpoint hit. Data received.", data: req.body })
  } catch (error) {
    console.error("Bulk import error:", error)
    res.status(500).json({ success: false, message: "Bulk import failed." })
  }
})

// Get single product by ID
router.get("/:id", validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        sc.name as subcategory_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pt.id,
              'tierName', pt.tier_name,
              'minQuantity', pt.min_quantity,
              'maxQuantity', pt.max_quantity,
              'sellingPrice', pt.selling_price
            )
          ) FILTER (WHERE pt.id IS NOT NULL), 
          '[]'
        ) as pricing_tiers,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'imageUrl', pi.image_url,
              'altText', pi.alt_text,
              'isPrimary', pi.is_primary,
              'sortOrder', pi.sort_order
            ) ORDER BY pi.sort_order, pi.is_primary DESC
          ) FILTER (WHERE pi.id IS NOT NULL), 
          '[]'
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_pricing_tiers pt ON p.id = pt.product_id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1 AND p.is_active = true
      GROUP BY p.id, c.name, sc.name
    `

    const result = await query(productQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.json({
      success: true,
      data: {
        product: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    })
  }
})

// Create new product (Admin only)
router.post(
  "/",
  rateLimit(5, 60000), // 5 attempts per minute
  // verifyToken,
  // requireAdmin,
  async (req, res) => {
    try {
      const {
        productName,
        productCode,
        description,
        longerDescription,
        categoryId,
        subcategoryId,
        costPrice,
        vatRate,
        stockUnits,
        alertQuantity,
        unitOfMeasure,
        packSize,
        productBarcode,
        etimsRefCode,
        expiryDate,
        preferredVendor1,
        preferredVendor2,
        vendorItemCode,
        cashbackRate,
        saCashback1stPurchase,
        saCashback2ndPurchase,
        saCashback3rdPurchase,
        saCashback4thPurchase,
        reorderLevel,
        orderLevel,
        reorderActive,
        pricingTiers,
      } = req.body

      // If categoryId is a string (category name), find the actual ID
      let actualCategoryId = categoryId
      let actualSubcategoryId = subcategoryId

      if (categoryId && typeof categoryId === "string" && isNaN(categoryId)) {
        const categoryResult = await query("SELECT id FROM categories WHERE name = $1", [categoryId])
        if (categoryResult.rows.length > 0) {
          actualCategoryId = categoryResult.rows[0].id
        }
      }

      if (subcategoryId && typeof subcategoryId === "string" && isNaN(subcategoryId)) {
        const subcategoryResult = await query("SELECT id FROM categories WHERE name = $1", [subcategoryId])
        if (subcategoryResult.rows.length > 0) {
          actualSubcategoryId = subcategoryResult.rows[0].id
        }
      }

      // Check if product code already exists
      const existingProduct = await query("SELECT id FROM products WHERE product_code = $1", [productCode])

      if (existingProduct.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Product code already exists",
        })
      }

      // Start transaction
      const result = await transaction(async (client) => {
        // Insert product with the resolved category IDs
        const productResult = await client.query(
          `
        INSERT INTO products (
          product_name, product_code, description, longer_description,
          category_id, subcategory_id, cost_price, vat_rate, stock_units,
          alert_quantity, unit_of_measure, pack_size, product_barcode,
          etims_ref_code, expiry_date, preferred_vendor_1, preferred_vendor_2,
          vendor_item_code, cashback_rate, sa_cashback_1st_purchase,
          sa_cashback_2nd_purchase, sa_cashback_3rd_purchase, sa_cashback_4th_purchase,
          reorder_level, order_level, reorder_active, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING id
      `,
          [
            productName,
            productCode,
            description,
            longerDescription,
            actualCategoryId,
            actualSubcategoryId,
            costPrice,
            vatRate,
            stockUnits,
            alertQuantity,
            unitOfMeasure,
            packSize,
            productBarcode,
            etimsRefCode,
            expiryDate,
            preferredVendor1,
            preferredVendor2,
            vendorItemCode,
            cashbackRate,
            saCashback1stPurchase || 6,
            saCashback2ndPurchase || 4,
            saCashback3rdPurchase || 3,
            saCashback4thPurchase || 2,
            reorderLevel,
            orderLevel,
            reorderActive !== false,
            req.user.id,
          ],
        )

        const productId = productResult.rows[0].id

        // Insert pricing tiers
        if (pricingTiers && pricingTiers.length > 0) {
          for (const tier of pricingTiers) {
            await client.query(
              `
            INSERT INTO product_pricing_tiers (
              product_id, tier_name, min_quantity, max_quantity, selling_price
            ) VALUES ($1, $2, $3, $4, $5)
          `,
              [productId, tier.tierName, tier.minQuantity, tier.maxQuantity, tier.sellingPrice],
            )
          }
        }

        // Record initial inventory movement
        await client.query(
          `
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, reference_type, notes, created_by
        ) VALUES ($1, 'in', $2, 'initial_stock', 'Initial stock entry', $3)
      `,
          [productId, stockUnits, req.user.id],
        )

        return productId
      })

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: {
          productId: result,
        },
      })
    } catch (error) {
      console.error("Create product error:", error)

      if (error.code === "23505") {
        // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: "Product code already exists",
        })
      }

      res.status(500).json({
        success: false,
        message: "Failed to create product",
      })
    }
  },
)

// Bulk Import Products (Admin only)
router.post("/bulk-import", verifyToken, requireAdmin, ProductController.bulkImportProducts)

// Update product (Admin only)
router.put("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if product exists
    const existingProduct = await query("SELECT id FROM products WHERE id = $1", [id])

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Build dynamic update query
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    const allowedFields = [
      "product_name",
      "description",
      "longer_description",
      "category_id",
      "subcategory_id",
      "cost_price",
      "vat_rate",
      "stock_units",
      "alert_quantity",
      "unit_of_measure",
      "pack_size",
      "product_barcode",
      "etims_ref_code",
      "expiry_date",
      "preferred_vendor_1",
      "preferred_vendor_2",
      "vendor_item_code",
      "cashback_rate",
      "sa_cashback_1st_purchase",
      "sa_cashback_2nd_purchase",
      "sa_cashback_3rd_purchase",
      "sa_cashback_4th_purchase",
      "reorder_level",
      "order_level",
      "reorder_active",
      "is_active",
      "is_featured",
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

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(id)

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount + 1}
      RETURNING id
    `

    await query(updateQuery, updateValues)

    res.json({
      success: true,
      message: "Product updated successfully",
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update product",
    })
  }
})

// Delete product (Admin only)
router.delete("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    // Soft delete - set is_active to false
    const result = await query(
      "UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    })
  }
})

// Get product pricing for quantity
router.get("/:id/pricing/:quantity", validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id, quantity } = req.params
    const qty = Number.parseInt(quantity)

    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      })
    }

    const query = `
      SELECT 
        p.id,
        p.product_name,
        p.cashback_rate,
        p.vat_rate,
        pt.tier_name,
        pt.min_quantity,
        pt.max_quantity,
        pt.selling_price
      FROM products p
      JOIN product_pricing_tiers pt ON p.id = pt.product_id
      WHERE p.id = $1 
        AND p.is_active = true
        AND pt.min_quantity <= $2 
        AND (pt.max_quantity IS NULL OR pt.max_quantity >= $2)
      ORDER BY pt.min_quantity DESC
      LIMIT 1
    `

    const result = await query(query, [id, qty])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product or pricing tier not found",
      })
    }

    const pricing = result.rows[0]
    const totalPrice = pricing.selling_price * qty
    const priceExclVat = totalPrice / (1 + pricing.vat_rate / 100)
    const vatAmount = totalPrice - priceExclVat
    const cashbackAmount = (priceExclVat * pricing.cashback_rate) / 100

    res.json({
      success: true,
      data: {
        productId: pricing.id,
        productName: pricing.product_name,
        quantity: qty,
        tierName: pricing.tier_name,
        unitPrice: pricing.selling_price,
        totalPrice,
        priceExclVat: Math.round(priceExclVat * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        cashbackRate: pricing.cashback_rate,
        cashbackAmount: Math.round(cashbackAmount * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Get product pricing error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get product pricing",
    })
  }
})

// Update product stock (Admin only)
router.patch("/:id/stock", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const { quantity, movementType, notes } = req.body

    if (!quantity || !movementType) {
      return res.status(400).json({
        success: false,
        message: "Quantity and movement type are required",
      })
    }

    if (!["in", "out", "adjustment"].includes(movementType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movement type",
      })
    }

    // Start transaction
    await transaction(async (client) => {
      // Get current stock
      const productResult = await client.query("SELECT stock_units FROM products WHERE id = $1 AND is_active = true", [
        id,
      ])

      if (productResult.rows.length === 0) {
        throw new Error("Product not found")
      }

      const currentStock = productResult.rows[0].stock_units
      let newStock

      switch (movementType) {
        case "in":
          newStock = currentStock + quantity
          break
        case "out":
          newStock = Math.max(0, currentStock - quantity)
          break
        case "adjustment":
          newStock = quantity
          break
      }

      // Update product stock
      await client.query("UPDATE products SET stock_units = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        newStock,
        id,
      ])

      // Record inventory movement
      const movementQuantity =
        movementType === "adjustment" ? quantity - currentStock : movementType === "in" ? quantity : -quantity

      await client.query(
        `
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, reference_type, notes, created_by
        ) VALUES ($1, $2, $3, 'manual', $4, $5)
      `,
        [id, movementType, movementQuantity, notes, req.user.id],
      )
    })

    res.json({
      success: true,
      message: "Stock updated successfully",
    })
  } catch (error) {
    console.error("Update stock error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update stock",
    })
  }
})

export default router
