import jwt from "jsonwebtoken"
const { sign } = jwt
import bcrypt from 'bcryptjs'; // ✅ Default import
const { hash } = bcrypt;

import db from "../database/models/index.js"

class ProductController {
  static uploadProducts = async (req, res) => {
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

      // Check if product code already exists
      const existingProduct = await db.Product.findOne({
        where: { productCode },
      })

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product code already exists",
        })
      }

      // Create product
      const newProduct = await db.Product.create({
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
        saCashback1stPurchase: saCashback1stPurchase || 6,
        saCashback2ndPurchase: saCashback2ndPurchase || 4,
        saCashback3rdPurchase: saCashback3rdPurchase || 3,
        saCashback4thPurchase: saCashback4thPurchase || 2,
        reorderLevel,
        orderLevel,
        reorderActive: reorderActive !== false,
        createdBy: req.user.id,
      })

      // Create pricing tiers if provided
      if (pricingTiers && pricingTiers.length > 0) {
        for (const tier of pricingTiers) {
          await db.ProductPricingTier.create({
            productId: newProduct.id,
            tierName: tier.tierName,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            sellingPrice: tier.sellingPrice,
          })
        }
      }

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: { product: newProduct },
      })
    } catch (error) {
      console.error("Upload products error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to create product",
      })
    }
  }

  static signUp = async (req, res) => {
    const { email, password, userType, companyId } = req.body

    try {
      const existingUser = await db.User.findOne({ where: { email, userType } })

      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email is already in use" })
      }

      const hashedPassword = await hash(password, 10)

      const newUser = await db.User.create({
        email,
        password: hashedPassword,
        userType,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const token = sign(
        { id: newUser.id, email: newUser.email, userType: newUser.userType, companyId: newUser.companyId },
        process.env.JWT_SECRET,
        {
          expiresIn: "23h",
        },
      )

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        companyId: newUser.companyId,
        userType: newUser.userType,
        user: newUser,
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: "Failed to sign up" })
    }
  }

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

    // Import query and transaction functions
    const { query, transaction } = await import("../config/database.js")

    for (const productData of products) {
      // Basic validation
      const {
        productName, // Renamed from product_name for frontend consistency
        productCode, // Renamed from product_code
        categoryName, // Renamed from category_name
        subcategoryName, // Renamed from subcategory_name
        costPrice, // Renamed from cost_price
        sellingPrice, // This will be used for the first pricing tier
        stockUnits, // Renamed from stock_units
        vatRate = 16.0, // Default VAT rate
        unitOfMeasure = "PC",
        alertQuantity = 10,
        // other fields from schema.sql like description, longer_description, pack_size etc. can be added
      } = productData

      if (!productName || !productCode || !categoryName || !costPrice || !sellingPrice || stockUnits === undefined) {
        results.push({ productCode: productCode || "N/A", success: false, message: "Missing required fields (productName, productCode, categoryName, costPrice, sellingPrice, stockUnits)." })
        errorCount++
        continue
      }

      // Generate a simple slug from name (can be improved)
      const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');


      try {
        await transaction(async (client) => {
          let categoryId = null
          let subcategoryId = null

          // 1. Handle Category
          let categoryResult = await client.query("SELECT id FROM categories WHERE name = $1 AND parent_id IS NULL", [categoryName])
          if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id
          } else {
            const newCategorySlug = generateSlug(categoryName);
            categoryResult = await client.query(
              "INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, true) RETURNING id",
              [categoryName, newCategorySlug]
            )
            categoryId = categoryResult.rows[0].id
          }

          // 2. Handle Subcategory (if provided)
          if (subcategoryName) {
            let subcategoryResult = await client.query(
              "SELECT id FROM categories WHERE name = $1 AND parent_id = $2",
              [subcategoryName, categoryId]
            )
            if (subcategoryResult.rows.length > 0) {
              subcategoryId = subcategoryResult.rows[0].id
            } else {
              const newSubCategorySlug = generateSlug(subcategoryName);
              subcategoryResult = await client.query(
                "INSERT INTO categories (name, slug, parent_id, is_active) VALUES ($1, $2, $3, true) RETURNING id",
                [subcategoryName, newSubCategorySlug, categoryId]
              )
              subcategoryId = subcategoryResult.rows[0].id
            }
          }

          // 3. Insert Product
          // Note: Ensure all required fields from schema that don't have defaults are included.
          // Add other fields as needed from productData.
          const productInsertQuery = `
            INSERT INTO products (
              product_name, product_code, category_id, subcategory_id,
              cost_price, stock_units, vat_rate, unit_of_measure, alert_quantity,
              description, longer_description, pack_size, product_barcode, etims_ref_code,
              cashback_rate, is_active, is_featured
              -- created_by will be null unless you have user context here
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, false
            ) RETURNING id
          `
          const productResult = await client.query(productInsertQuery, [
            productName, productCode, categoryId, subcategoryId,
            costPrice, stockUnits, vatRate, unitOfMeasure, alertQuantity,
            productData.description || null, productData.longerDescription || null,
            productData.packSize || null, productData.productBarcode || null, productData.etimsRefCode || null,
            productData.cashbackRate || 0.00
          ])
          const productId = productResult.rows[0].id

          // 4. Insert Default Pricing Tier (using sellingPrice)
          // Assuming a default tier or if pricingTiers array is not part of bulk import for simplicity
          await client.query(
            `INSERT INTO product_pricing_tiers (product_id, tier_name, min_quantity, selling_price)
             VALUES ($1, $2, $3, $4)`,
            [productId, "Default", 1, sellingPrice]
          )

          // 5. Record initial inventory movement (optional, but good practice)
          await client.query(
            `INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, notes)
             VALUES ($1, 'in', $2, 'bulk_import', 'Initial stock from bulk import')`,
            [productId, stockUnits]
          );

          results.push({ productCode, success: true, message: "Product imported successfully." })
          successCount++
        })
      } catch (error) {
        console.error(`Error importing product ${productCode}:`, error)
        // Check for unique constraint violation for product_code
        if (error.code === '23505' && error.constraint === 'products_product_code_key') {
          results.push({ productCode, success: false, message: `Product code '${productCode}' already exists.` })
        } else if (error.code === '23505' && error.constraint === 'categories_slug_key') {
           results.push({ productCode, success: false, message: `Category or Subcategory slug already exists. Product: ${productCode}`})
        }
        else {
          results.push({ productCode, success: false, message: error.message || "An unexpected error occurred." })
        }
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
