import { db } from "../config/database.js"

export class CMSService {
  // Content methods
  static async getContentByType(type) {
    const query = `
      SELECT * FROM cms_content 
      WHERE content_type = $1 AND status = 'published' AND is_active = true
      ORDER BY sort_order ASC, created_at DESC
    `
    const result = await db.query(query, [type])
    return result.rows
  }

  static async createContent(contentData) {
    const { content_type, title, slug, content, meta_data, status = "draft", sort_order = 0, created_by } = contentData

    const query = `
      INSERT INTO cms_content (content_type, title, slug, content, meta_data, status, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const values = [
      content_type,
      title,
      slug,
      JSON.stringify(content),
      JSON.stringify(meta_data),
      status,
      sort_order,
      created_by,
    ]
    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async updateContent(id, updateData) {
    const { title, content, meta_data, status, sort_order, is_active, updated_by } = updateData

    const query = `
      UPDATE cms_content 
      SET title = COALESCE($2, title),
          content = COALESCE($3, content),
          meta_data = COALESCE($4, meta_data),
          status = COALESCE($5, status),
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const values = [
      id,
      title,
      content ? JSON.stringify(content) : null,
      meta_data ? JSON.stringify(meta_data) : null,
      status,
      sort_order,
      is_active,
      updated_by,
    ]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async deleteContent(id) {
    const query = "DELETE FROM cms_content WHERE id = $1"
    await db.query(query, [id])
  }

  // Navigation methods
  static async getNavigationMenu(location) {
    const query = `
      SELECT * FROM cms_navigation_menus 
      WHERE menu_location = $1 AND is_active = true
      ORDER BY sort_order ASC
    `
    const result = await db.query(query, [location])
    return result.rows
  }

  static async createNavigationMenu(menuData) {
    const { menu_name, menu_location, menu_items, sort_order = 0 } = menuData

    const query = `
      INSERT INTO cms_navigation_menus (menu_name, menu_location, menu_items, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const values = [menu_name, menu_location, JSON.stringify(menu_items), sort_order]
    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async updateNavigationMenu(id, updateData) {
    const { menu_name, menu_items, is_active, sort_order } = updateData

    const query = `
      UPDATE cms_navigation_menus 
      SET menu_name = COALESCE($2, menu_name),
          menu_items = COALESCE($3, menu_items),
          is_active = COALESCE($4, is_active),
          sort_order = COALESCE($5, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const values = [id, menu_name, menu_items ? JSON.stringify(menu_items) : null, is_active, sort_order]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async deleteNavigationMenu(id) {
    const query = "DELETE FROM cms_navigation_menus WHERE id = $1"
    await db.query(query, [id])
  }

  // Banner methods
  static async getBanners(type) {
    let query = `
      SELECT * FROM cms_banners 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
      AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
    `

    const values = []
    if (type) {
      query += " AND banner_type = $1"
      values.push(type)
    }

    query += " ORDER BY sort_order ASC, created_at DESC"

    const result = await db.query(query, values)
    return result.rows
  }

  static async createBanner(bannerData) {
    const {
      banner_name,
      banner_type,
      title,
      subtitle,
      description,
      image_url,
      link_url,
      cta_text,
      background_color,
      text_color,
      position,
      start_date,
      end_date,
      sort_order = 0,
    } = bannerData

    const query = `
      INSERT INTO cms_banners (
        banner_name, banner_type, title, subtitle, description, image_url,
        link_url, cta_text, background_color, text_color, position,
        start_date, end_date, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `

    const values = [
      banner_name,
      banner_type,
      title,
      subtitle,
      description,
      image_url,
      link_url,
      cta_text,
      background_color,
      text_color,
      position,
      start_date,
      end_date,
      sort_order,
    ]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async updateBanner(id, updateData) {
    const fields = Object.keys(updateData).filter((key) => updateData[key] !== undefined)
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ")

    const query = `
      UPDATE cms_banners 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const values = [id, ...fields.map((field) => updateData[field])]
    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async deleteBanner(id) {
    const query = "DELETE FROM cms_banners WHERE id = $1"
    await db.query(query, [id])
  }

  // Featured products methods
  static async getFeaturedProducts(section) {
    let query = `
      SELECT cfp.*, p.product_name, p.description, p.cost_price, pi.image_url
      FROM cms_featured_products cfp
      JOIN products p ON cfp.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE cfp.is_active = true
      AND (cfp.start_date IS NULL OR cfp.start_date <= CURRENT_TIMESTAMP)
      AND (cfp.end_date IS NULL OR cfp.end_date >= CURRENT_TIMESTAMP)
    `

    const values = []
    if (section) {
      query += " AND cfp.section_name = $1"
      values.push(section)
    }

    query += " ORDER BY cfp.featured_order ASC, cfp.created_at DESC"

    const result = await db.query(query, values)
    return result.rows
  }

  static async createFeaturedProduct(featuredData) {
    const {
      section_name,
      product_id,
      featured_order = 0,
      custom_title,
      custom_description,
      custom_image_url,
      start_date,
      end_date,
    } = featuredData

    const query = `
      INSERT INTO cms_featured_products (
        section_name, product_id, featured_order, custom_title,
        custom_description, custom_image_url, start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const values = [
      section_name,
      product_id,
      featured_order,
      custom_title,
      custom_description,
      custom_image_url,
      start_date,
      end_date,
    ]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async updateFeaturedProduct(id, updateData) {
    const fields = Object.keys(updateData).filter((key) => updateData[key] !== undefined)
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ")

    const query = `
      UPDATE cms_featured_products 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const values = [id, ...fields.map((field) => updateData[field])]
    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async deleteFeaturedProduct(id) {
    const query = "DELETE FROM cms_featured_products WHERE id = $1"
    await db.query(query, [id])
  }

  // Settings methods
  static async getPublicSettings() {
    const query = `
      SELECT setting_group, setting_key, setting_value, setting_type
      FROM cms_settings 
      WHERE is_public = true
      ORDER BY setting_group, setting_key
    `
    const result = await db.query(query)

    // Group settings by setting_group
    const grouped = {}
    result.rows.forEach((row) => {
      if (!grouped[row.setting_group]) {
        grouped[row.setting_group] = {}
      }
      grouped[row.setting_group][row.setting_key] = row.setting_value
    })

    return grouped
  }

  static async getAllSettings() {
    const query = `
      SELECT * FROM cms_settings 
      ORDER BY setting_group, setting_key
    `
    const result = await db.query(query)
    return result.rows
  }

  static async updateSettings(settingsData) {
    const updates = []

    for (const [group, settings] of Object.entries(settingsData)) {
      for (const [key, value] of Object.entries(settings)) {
        const query = `
          INSERT INTO cms_settings (setting_group, setting_key, setting_value)
          VALUES ($1, $2, $3)
          ON CONFLICT (setting_group, setting_key)
          DO UPDATE SET setting_value = $3, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `

        const result = await db.query(query, [group, key, value])
        updates.push(result.rows[0])
      }
    }

    return updates
  }

  // Media methods
  static async uploadMedia(file, mediaData) {
    const {
      file_name,
      original_name,
      file_path,
      file_url,
      file_type,
      file_size,
      mime_type,
      alt_text,
      caption,
      uploaded_by,
    } = mediaData

    const query = `
      INSERT INTO cms_media (
        file_name, original_name, file_path, file_url, file_type,
        file_size, mime_type, alt_text, caption, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `

    const values = [
      file_name,
      original_name,
      file_path,
      file_url,
      file_type,
      file_size,
      mime_type,
      alt_text,
      caption,
      uploaded_by,
    ]

    const result = await db.query(query, values)
    return result.rows[0]
  }

  static async getMedia({ page = 1, limit = 20, type }) {
    const offset = (page - 1) * limit

    let query = `
      SELECT * FROM cms_media 
      WHERE is_active = true
    `

    const values = []
    if (type) {
      query += " AND file_type = $1"
      values.push(type)
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
    values.push(limit, offset)

    const result = await db.query(query, values)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM cms_media WHERE is_active = true"
    const countValues = []
    if (type) {
      countQuery += " AND file_type = $1"
      countValues.push(type)
    }

    const countResult = await db.query(countQuery, countValues)
    const total = Number.parseInt(countResult.rows[0].count)

    return {
      media: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  static async deleteMedia(id) {
    const query = "UPDATE cms_media SET is_active = false WHERE id = $1"
    await db.query(query, [id])
  }
}
