import jwt from "jsonwebtoken"
const { sign } = jwt
import bcrypt from "bcryptjs"
const { hash } = bcrypt
import { query, transaction } from "../config/database.js"

class ProductController {
  // Helper function to convert camelCase to snake_case
  static camelToSnake(obj) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
      result[snakeKey] = value
    }
    return result
  }

  // Helper function to convert snake_case to camelCase
  static snakeToCamel(obj) {
    const result = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
      result[camelKey] = value
    }
    return result
  }

  // Create new product
  static createProduct = async (req, res) => {
    try {
      const {
        productName,
        productCode,
        description,
        longerDescription,
        categoryId,
        subcategoryId,
        costPrice,
        vatRate = 16.0,
        stockUnits,
        alertQuantity = 10,
        unitOfMeasure = "PC",
        packSize = 1,
        productBarcode,
        etimsRefCode,
        expiryDate,
        preferredVendor1,
        preferredVendor2,
        vendorItemCode,
        cashbackRate = 0.0,
        saCashback1stPurchase = 6.0,
        saCashback2ndPurchase = 4.0,
        saCashback3rdPurchase = 3.0,
        saCashback4thPurchase = 2.0,
        reorderLevel = 0,
        orderLevel = 0,
        reorderActive = true,
        pricingTiers = [],
        isActive = true,
        isFeatured = false,
      } = req.body

      // Validate required fields
      if (!productName || !productCode || !costPrice || stockUnits === undefined) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productName, productCode, costPrice, stockUnits",
        })
      }

      // Check if product code already exists
      const existingProduct = await query("SELECT id FROM products WHERE product_code = $1", [productCode])

      if (existingProduct.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Product code already exists",
        })
      }

      // Handle category resolution
      let resolvedCategoryId = categoryId
      let resolvedSubcategoryId = subcategoryId

      if (categoryId && typeof categoryId === "string" && isNaN(categoryId)) {
        const categoryResult = await query("SELECT id FROM categories WHERE name = $1", [categoryId])
        if (categoryResult.rows.length > 0) {
          resolvedCategoryId = categoryResult.rows[0].id
        }
      }

      if (subcategoryId && typeof subcategoryId === "string" && isNaN(subcategoryId)) {
        const subcategoryResult = await query("SELECT id FROM categories WHERE name = $1", [subcategoryId])
        if (subcategoryResult.rows.length > 0) {
          resolvedSubcategoryId = subcategoryResult.rows[0].id
        }
      }

      // Start transaction
      const result = await transaction(async (client) => {
        // Insert product
        const productResult = await client.query(
          `
          INSERT INTO products (
            product_name, product_code, description, longer_description,
            category_id, subcategory_id, cost_price, vat_rate, stock_units,
            alert_quantity, unit_of_measure, pack_size, product_barcode,
            etims_ref_code, expiry_date, preferred_vendor_1, preferred_vendor_2,
            vendor_item_code, cashback_rate, sa_cashback_1st_purchase,
            sa_cashback_2nd_purchase, sa_cashback_3rd_purchase, sa_cashback_4th_purchase,
            reorder_level, order_level, reorder_active, is_active, is_featured, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          ) RETURNING id
        `,
          [
            productName,
            productCode,
            description,
            longerDescription,
            resolvedCategoryId,
            resolvedSubcategoryId,
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
            isActive,
            isFeatured,
            req.user?.id || null,
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
              [
                productId,
                tier.tierName || `Tier ${tier.minQuantity}-${tier.maxQuantity || "∞"}`,
                tier.minQuantity,
                tier.maxQuantity,
                tier.sellingPrice,
              ],
            )
          }
        } else {
          // Create default pricing tier if none provided
          const defaultSellingPrice = costPrice * 1.3 // 30% markup
          await client.query(
            `
            INSERT INTO product_pricing_tiers (
              product_id, tier_name, min_quantity, selling_price
            ) VALUES ($1, $2, $3, $4)
          `,
            [productId, "Default", 1, defaultSellingPrice],
          )
        }

        // Record initial inventory movement
        await client.query(
          `
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reference_type, notes, created_by
          ) VALUES ($1, 'in', $2, 'initial_stock', 'Initial stock entry', $3)
        `,
          [productId, stockUnits, req.user?.id || null],
        )

        return productId
      })

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: { productId: result },
      })
    } catch (error) {
      console.error("Create product error:", error)

      if (error.code === "23505") {
        return res.status(400).json({
          success: false,
          message: "Product code already exists",
        })
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create product",
      })
    }
  }

  // Get all products with proper field mapping
  static getProducts = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
        search,
        category,
        isActive = true,
      } = req.query

      const offset = (page - 1) * limit
      let whereClause = "WHERE p.is_active = $1"
      const queryParams = [isActive]
      let paramCount = 1

      if (search) {
        paramCount++
        whereClause += ` AND (p.product_name ILIKE $${paramCount} OR p.product_code ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
        queryParams.push(`%${search}%`)
      }

      if (category) {
        paramCount++
        whereClause += ` AND c.name = $${paramCount}`
        queryParams.push(category)
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

      // Convert snake_case to camelCase for frontend
      const products = result.rows.map((product) => ({
        ...this.snakeToCamel(product),
        pricingTiers: product.pricing_tiers,
        images: product.images,
      }))

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `
      const countResult = await query(countQuery, queryParams.slice(0, paramCount))
      const total = Number.parseInt(countResult.rows[0].total)

      res.json({
        success: true,
        data: {
          products,
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
  }

  // Get single product by ID
  static getProduct = async (req, res) => {
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

      const product = {
        ...this.snakeToCamel(result.rows[0]),
        pricingTiers: result.rows[0].pricing_tiers,
        images: result.rows[0].images,
      }

      res.json({
        success: true,
        data: { product },
      })
    } catch (error) {
      console.error("Get product error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch product",
      })
    }
  }

  // Update product
  static updateProduct = async (req, res) => {
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

      // Convert camelCase to snake_case for database
      const snakeData = this.camelToSnake(updateData)

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

      for (const [key, value] of Object.entries(snakeData)) {
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
  }

  // Delete product (soft delete)
  static deleteProduct = async (req, res) => {
    try {
      const { id } = req.params

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
  }

  // Bulk import products
  static bulkImportProducts = async (req, res) => {
    const { products } = req.body

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products data provided, or data is not an array.",
      })
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const productData of products) {
      const {
        productName,
        productCode,
        categoryName,
        subcategoryName,
        costPrice,
        sellingPrice,
        stockUnits,
        vatRate = 16.0,
        unitOfMeasure = "PC",
        alertQuantity = 10,
        description,
        cashbackRate = 0.0,
      } = productData

      if (!productName || !productCode || !categoryName || !costPrice || !sellingPrice || stockUnits === undefined) {
        results.push({
          productCode: productCode || "N/A",
          success: false,
          message: "Missing required fields",
        })
        errorCount++
        continue
      }

      try {
        await transaction(async (client) => {
          let categoryId = null
          let subcategoryId = null

          // Handle Category
          let categoryResult = await client.query("SELECT id FROM categories WHERE name = $1 AND parent_id IS NULL", [
            categoryName,
          ])

          if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id
          } else {
            const slug = categoryName
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "")
            categoryResult = await client.query(
              "INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, true) RETURNING id",
              [categoryName, slug],
            )
            categoryId = categoryResult.rows[0].id
          }

          // Handle Subcategory
          if (subcategoryName) {
            let subcategoryResult = await client.query("SELECT id FROM categories WHERE name = $1 AND parent_id = $2", [
              subcategoryName,
              categoryId,
            ])

            if (subcategoryResult.rows.length > 0) {
              subcategoryId = subcategoryResult.rows[0].id
            } else {
              const slug = subcategoryName
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
              subcategoryResult = await client.query(
                "INSERT INTO categories (name, slug, parent_id, is_active) VALUES ($1, $2, $3, true) RETURNING id",
                [subcategoryName, slug, categoryId],
              )
              subcategoryId = subcategoryResult.rows[0].id
            }
          }

          // Insert Product
          const productResult = await client.query(
            `
            INSERT INTO products (
              product_name, product_code, category_id, subcategory_id,
              cost_price, stock_units, vat_rate, unit_of_measure, alert_quantity,
              description, cashback_rate, is_active
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true
            ) RETURNING id
          `,
            [
              productName,
              productCode,
              categoryId,
              subcategoryId,
              costPrice,
              stockUnits,
              vatRate,
              unitOfMeasure,
              alertQuantity,
              description,
              cashbackRate,
            ],
          )

          const productId = productResult.rows[0].id

          // Insert Default Pricing Tier
          await client.query(
            `
            INSERT INTO product_pricing_tiers (product_id, tier_name, min_quantity, selling_price)
            VALUES ($1, $2, $3, $4)
          `,
            [productId, "Default", 1, sellingPrice],
          )

          // Record initial inventory movement
          await client.query(
            `
            INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, notes)
            VALUES ($1, 'in', $2, 'bulk_import', 'Initial stock from bulk import')
          `,
            [productId, stockUnits],
          )

          results.push({
            productCode,
            success: true,
            message: "Product imported successfully",
          })
          successCount++
        })
      } catch (error) {
        console.error(`Error importing product ${productCode}:`, error)

        let errorMessage = "An unexpected error occurred"
        if (error.code === "23505" && error.constraint === "products_product_code_key") {
          errorMessage = `Product code '${productCode}' already exists`
        }

        results.push({
          productCode,
          success: false,
          message: errorMessage,
        })
        errorCount++
      }
    }

    const statusCode = errorCount > 0 && successCount > 0 ? 207 : errorCount > 0 ? 400 : 201
    return res.status(statusCode).json({
      success: errorCount === 0,
      message: `Bulk import finished. ${successCount} succeeded, ${errorCount} failed.`,
      results,
    })
  }
}

export default ProductController
