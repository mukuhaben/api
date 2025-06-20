import express from "express"
import db from "../config/database.js"
import { verifyToken, requireAdmin } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get all categories with subcategories
router.get("/", async (req, res) => {
  try {
    const query = `
  WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT 
      id, name, description, parent_id, slug, image_url, 
      is_active, sort_order, created_at, updated_at,
      0 as level,
      ARRAY[sort_order::text, id::text] as path
    FROM categories 
    WHERE parent_id IS NULL AND is_active = true

    UNION ALL

    -- Recursive case: subcategories
    SELECT 
      c.id, c.name, c.description, c.parent_id, c.slug, c.image_url,
      c.is_active, c.sort_order, c.created_at, c.updated_at,
      ct.level + 1,
      ct.path || ARRAY[c.sort_order::text, c.id::text]
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT 
    ct.*,
    COUNT(p.id) as product_count
  FROM category_tree ct
  LEFT JOIN products p ON ct.id = p.category_id AND p.is_active = true
  GROUP BY ct.id, ct.name, ct.description, ct.parent_id, ct.slug, 
           ct.image_url, ct.is_active, ct.sort_order, ct.created_at, 
           ct.updated_at, ct.level, ct.path
  ORDER BY ct.path
`


    const result = await db.query(query)

    // Build hierarchical structure
    const categoryMap = new Map()
    const rootCategories = []

    result.rows.forEach((category) => {
      category.subCategories = []
      categoryMap.set(category.id, category)

      if (category.parent_id === null) {
        rootCategories.push(category)
      }
    })

    result.rows.forEach((category) => {
      if (category.parent_id !== null) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.subCategories.push(category)
        }
      }
    })

    res.json({
      success: true,
      data: {
        categories: rootCategories,
      },
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    })
  }
})

// Get single category
router.get("/:id", validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        c.*,
        COUNT(p.id) as product_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id, parent.name
    `

    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Get subcategories
    const subCategoriesResult = await db.query(
      `
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.parent_id = $1 AND c.is_active = true
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `,
      [id],
    )

    const category = result.rows[0]
    category.subCategories = subCategoriesResult.rows

    res.json({
      success: true,
      data: {
        category,
      },
    })
  } catch (error) {
    console.error("Get category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    })
  }
})

// Create new category (Admin only)
router.post("/", verifyToken, requireAdmin, validate(schemas.categoryCreation), async (req, res) => {
  try {
    const { name, description, parentId, slug, imageUrl, sortOrder } = req.body

    // Check if slug already exists
    const existingCategory = await db.query("SELECT id FROM categories WHERE slug = $1", [slug])

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      })
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentResult = await db.query("SELECT id FROM categories WHERE id = $1 AND is_active = true", [parentId])

      if (parentResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        })
      }
    }

    const result = await db.query(
      `
      INSERT INTO categories (name, description, parent_id, slug, image_url, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, slug
    `,
      [name, description, parentId, slug, imageUrl, sortOrder || 0],
    )

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Create category error:", error)

    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to create category",
    })
  }
})

// Update category (Admin only)
router.put("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, parentId, slug, imageUrl, sortOrder, isActive } = req.body

    // Check if category exists
    const existingCategory = await db.query("SELECT id FROM categories WHERE id = $1", [id])

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Check if slug is unique (excluding current category)
    if (slug) {
      const slugCheck = await db.query("SELECT id FROM categories WHERE slug = $1 AND id != $2", [slug, id])

      if (slugCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Category slug already exists",
        })
      }
    }

    // Build dynamic update query
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    const allowedFields = {
      name,
      description,
      parentId: "parent_id",
      slug,
      imageUrl: "image_url",
      sortOrder: "sort_order",
      isActive: "is_active",
    }

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.hasOwnProperty(key) && value !== undefined) {
        paramCount++
        const dbField = allowedFields[key] || key
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
      UPDATE categories 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount + 1}
      RETURNING id, name, slug
    `

    const result = await db.query(updateQuery, updateValues)

    res.json({
      success: true,
      message: "Category updated successfully",
      data: {
        category: result.rows[0],
      },
    })
  } catch (error) {
    console.error("Update category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    })
  }
})

// Delete category (Admin only)
router.delete("/:id", verifyToken, requireAdmin, validate(schemas.uuidParam, "params"), async (req, res) => {
  try {
    const { id } = req.params

    // Check if category has products
    const productCheck = await db.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = $1 OR subcategory_id = $1",
      [id],
    )

    if (Number.parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with associated products",
      })
    }

    // Check if category has subcategories
    const subCategoryCheck = await db.query("SELECT COUNT(*) as count FROM categories WHERE parent_id = $1", [id])

    if (Number.parseInt(subCategoryCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with subcategories",
      })
    }

    // Soft delete - set is_active to false
    const result = await db.query(
      "UPDATE categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id",
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    res.json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Delete category error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    })
  }
})

// Get products by category
router.get(
  "/:id/products",
  validate(schemas.uuidParam, "params"),
  validate(schemas.pagination, "query"),
  async (req, res) => {
    try {
      const { id } = req.params
      const { page, limit, sortBy, sortOrder, search } = req.query
      const offset = (page - 1) * limit

      // Verify category exists
      const categoryResult = await db.query("SELECT id, name FROM categories WHERE id = $1 AND is_active = true", [id])

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        })
      }

      let whereClause = "WHERE (p.category_id = $1 OR p.subcategory_id = $1) AND p.is_active = true"
      const queryParams = [id]
      let paramCount = 1

      if (search) {
        paramCount++
        whereClause += ` AND (p.product_name ILIKE $${paramCount} OR p.product_code ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
        queryParams.push(`%${search}%`)
      }

      const query = `
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
              'isPrimary', pi.is_primary
            ) ORDER BY pi.is_primary DESC, pi.sort_order
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

      const result = await db.query(query, queryParams)

      // Get total count
      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `

      const countResult = await db.query(countQuery, queryParams.slice(0, paramCount))
      const total = Number.parseInt(countResult.rows[0].total)

      res.json({
        success: true,
        data: {
          category: categoryResult.rows[0],
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
      console.error("Get category products error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch category products",
      })
    }
  },
)

export default router
