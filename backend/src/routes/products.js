import express from "express"
import { verifyToken, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"
import ProductController from "../controllers/productController.js"
import { query } from "../db.js" // Declare the query variable

const router = express.Router()

// Get all products with filtering and pagination
router.get("/", validate(schemas.pagination, "query"), ProductController.getProducts)

// Get single product by ID
router.get("/:id", validate(schemas.uuidParam, "params"), ProductController.getProduct)

// Create new product (Admin only)
router.post("/", verifyToken, requireAdmin, ProductController.createProduct)

// Update product (Admin only)
router.put("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), ProductController.updateProduct)

// Delete product (Admin only)
router.delete("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), ProductController.deleteProduct)

// Bulk import products (Admin only)
router.post("/bulk-import", verifyToken, requireAdmin, ProductController.bulkImportProducts)

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

    const pricingQuery = `
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

    const result = await query(pricingQuery, [id, qty])

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

export default router
