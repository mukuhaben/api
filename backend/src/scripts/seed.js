import bcrypt from "bcryptjs"
import { query } from "../config/database.js"

async function seedDatabase() {
  try {
    console.log("Starting database seeding...")

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12)
    const adminResult = await query(
      `
      INSERT INTO users (
        username, email, password_hash, first_name, last_name, user_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
      ["admin", "admin@firstcraft.com", adminPassword, "Admin", "User", "admin"],
    )

    console.log("Admin user created")

    // Create sample sales agent
    const agentPassword = await bcrypt.hash("agent123", 12)
    const agentResult = await query(
      `
      INSERT INTO users (
        username, email, password_hash, first_name, last_name, user_type, agent_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
      ["salesagent", "agent@firstcraft.com", agentPassword, "Sales", "Agent", "sales_agent", "SA001"],
    )

    console.log("Sales agent created")

    // Create sample customer
    const customerPassword = await bcrypt.hash("customer123", 12)
    const customerResult = await query(
      `
      INSERT INTO users (
        username, email, password_hash, first_name, last_name, user_type, company_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
      ["customer", "customer@example.com", customerPassword, "John", "Doe", "customer", "ABC Corp"],
    )

    console.log("Sample customer created")

    // Create categories
    const categories = [
      {
        name: "Art Supplies",
        description: "Art and creative materials for drawing, painting and crafts",
        slug: "art-supplies",
      },
      {
        name: "General Stationery",
        description: "Essential office and school stationery items",
        slug: "general-stationery",
      },
      {
        name: "IT & Accessories",
        description: "Information technology equipment and accessories",
        slug: "it-accessories",
      },
      {
        name: "Furniture",
        description: "Office and institutional furniture",
        slug: "furniture",
      },
      {
        name: "Office Automation",
        description: "Office equipment and automation tools",
        slug: "office-automation",
      },
    ]

    const categoryIds = {}

    for (const category of categories) {
      const result = await query(
        `
        INSERT INTO categories (name, description, slug)
        VALUES ($1, $2, $3)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `,
        [category.name, category.description, category.slug],
      )

      if (result.rows.length > 0) {
        categoryIds[category.slug] = result.rows[0].id
      }
    }

    console.log("Categories created")

    // Create subcategories
    const subcategories = [
      {
        name: "Sketch Pads",
        description: "Drawing and sketching pads",
        slug: "sketch-pads",
        parent: "art-supplies",
      },
      {
        name: "Paper Products",
        description: "A4 paper, notebooks, sticky notes",
        slug: "paper-products",
        parent: "general-stationery",
      },
      {
        name: "Pens & Pencils",
        description: "Writing instruments",
        slug: "pens-pencils",
        parent: "general-stationery",
      },
      {
        name: "Printers",
        description: "Inkjet and laser printers",
        slug: "printers",
        parent: "it-accessories",
      },
      {
        name: "Chairs",
        description: "Office chairs and seating solutions",
        slug: "chairs",
        parent: "furniture",
      },
    ]

    for (const subcategory of subcategories) {
      const parentId = categoryIds[subcategory.parent]
      if (parentId) {
        await query(
          `
          INSERT INTO categories (name, description, slug, parent_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (slug) DO NOTHING
        `,
          [subcategory.name, subcategory.description, subcategory.slug, parentId],
        )
      }
    }

    console.log("Subcategories created")

    // Create sample products
    const products = [
      {
        product_name: "A4 Copy Paper",
        product_code: "PP001",
        description: "High quality 80gsm A4 copy paper, 500 sheets per ream",
        category_slug: "paper-products",
        unit_price: 650.0,
        stock_quantity: 500,
        reorder_level: 50,
        unit_of_measure: "ream",
        brand: "PaperMax",
        specifications: JSON.stringify({
          weight: "80gsm",
          size: "A4",
          sheets: 500,
          color: "white",
        }),
      },
      {
        product_name: "Ballpoint Pen - Blue",
        product_code: "BP001",
        description: "Smooth writing ballpoint pen with blue ink",
        category_slug: "pens-pencils",
        unit_price: 25.0,
        stock_quantity: 1000,
        reorder_level: 100,
        unit_of_measure: "piece",
        brand: "BIC",
        specifications: JSON.stringify({
          ink_color: "blue",
          tip_size: "1.0mm",
          type: "ballpoint",
        }),
      },
      {
        product_name: "HP LaserJet Pro M404n",
        product_code: "PR001",
        description: "Monochrome laser printer with network connectivity",
        category_slug: "printers",
        unit_price: 45000.0,
        stock_quantity: 25,
        reorder_level: 5,
        unit_of_measure: "unit",
        brand: "HP",
        specifications: JSON.stringify({
          type: "laser",
          color: "monochrome",
          connectivity: "ethernet, usb",
          print_speed: "38ppm",
        }),
      },
      {
        product_name: "Executive Office Chair",
        product_code: "CH001",
        description: "Ergonomic executive chair with lumbar support",
        category_slug: "chairs",
        unit_price: 15000.0,
        stock_quantity: 50,
        reorder_level: 10,
        unit_of_measure: "unit",
        brand: "ErgoMax",
        specifications: JSON.stringify({
          material: "leather",
          adjustable_height: true,
          lumbar_support: true,
          armrests: true,
        }),
      },
      {
        product_name: "Sketch Pad A4",
        product_code: "SP001",
        description: "200gsm sketch pad for drawing and artwork",
        category_slug: "sketch-pads",
        unit_price: 350.0,
        stock_quantity: 200,
        reorder_level: 30,
        unit_of_measure: "pad",
        brand: "ArtPro",
        specifications: JSON.stringify({
          paper_weight: "200gsm",
          size: "A4",
          pages: 50,
          binding: "spiral",
        }),
      },
    ]

    // Get category IDs for products
    const categoryQuery = await query("SELECT id, slug FROM categories")
    const categoryMap = {}
    categoryQuery.rows.forEach((cat) => {
      categoryMap[cat.slug] = cat.id
    })

    // Insert products
    for (const product of products) {
      const categoryId = categoryMap[product.category_slug]
      if (categoryId) {
        await query(
          `
          INSERT INTO products (
            product_name, product_code, description, category_id, 
            unit_price, stock_quantity, reorder_level, unit_of_measure,
            brand, specifications, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (product_code) DO NOTHING
        `,
          [
            product.product_name,
            product.product_code,
            product.description,
            categoryId,
            product.unit_price,
            product.stock_quantity,
            product.reorder_level,
            product.unit_of_measure,
            product.brand,
            product.specifications,
            true,
          ],
        )
      }
    }

    console.log("Products created")

    // Create suppliers
    const suppliers = [
      {
        supplier_name: "Stationery World Ltd",
        contact_person: "Jane Smith",
        email: "jane@stationeryworld.co.ke",
        phone: "+254712345678",
        address: "123 Industrial Area, Nairobi",
        city: "Nairobi",
        country: "Kenya",
        payment_terms: "30 days",
        supplier_code: "SUP001",
      },
      {
        supplier_name: "Tech Solutions Kenya",
        contact_person: "Michael Johnson",
        email: "michael@techsolutions.co.ke",
        phone: "+254723456789",
        address: "456 Westlands, Nairobi",
        city: "Nairobi",
        country: "Kenya",
        payment_terms: "45 days",
        supplier_code: "SUP002",
      },
      {
        supplier_name: "Office Furniture Co.",
        contact_person: "Sarah Wilson",
        email: "sarah@officefurniture.co.ke",
        phone: "+254734567890",
        address: "789 Mombasa Road, Nairobi",
        city: "Nairobi",
        country: "Kenya",
        payment_terms: "60 days",
        supplier_code: "SUP003",
      },
    ]

    const supplierIds = {}
    for (const supplier of suppliers) {
      const result = await query(
        `
        INSERT INTO suppliers (
          supplier_name, contact_person, email, phone, address,
          city, country, payment_terms, supplier_code, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (supplier_code) DO NOTHING
        RETURNING id
      `,
        [
          supplier.supplier_name,
          supplier.contact_person,
          supplier.email,
          supplier.phone,
          supplier.address,
          supplier.city,
          supplier.country,
          supplier.payment_terms,
          supplier.supplier_code,
          true,
        ],
      )

      if (result.rows.length > 0) {
        supplierIds[supplier.supplier_code] = result.rows[0].id
      }
    }

    console.log("Suppliers created")

    // Create sample orders
    const customerUser = await query("SELECT id FROM users WHERE user_type = $1 LIMIT 1", ["customer"])
    const agentUser = await query("SELECT id FROM users WHERE user_type = $1 LIMIT 1", ["sales_agent"])

    if (customerUser.rows.length > 0) {
      const customerId = customerUser.rows[0].id
      const agentId = agentUser.rows.length > 0 ? agentUser.rows[0].id : null

      // Create sample order
      const orderResult = await query(
        `
        INSERT INTO orders (
          customer_id, sales_agent_id, order_number, order_status,
          subtotal, tax_amount, total_amount, shipping_address,
          billing_address, payment_method, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [
          customerId,
          agentId,
          "ORD-2024-001",
          "pending",
          1000.0,
          160.0,
          1160.0,
          JSON.stringify({
            street: "123 Main Street",
            city: "Nairobi",
            postal_code: "00100",
            country: "Kenya",
          }),
          JSON.stringify({
            street: "123 Main Street",
            city: "Nairobi",
            postal_code: "00100",
            country: "Kenya",
          }),
          "mpesa",
          "pending",
        ],
      )

      if (orderResult.rows.length > 0) {
        const orderId = orderResult.rows[0].id

        // Get some products for order items
        const productResults = await query("SELECT id, unit_price FROM products LIMIT 3")

        for (let i = 0; i < productResults.rows.length; i++) {
          const product = productResults.rows[i]
          const quantity = Math.floor(Math.random() * 5) + 1

          await query(
            `
            INSERT INTO order_items (
              order_id, product_id, quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5)
          `,
            [orderId, product.id, quantity, product.unit_price, quantity * product.unit_price],
          )
        }
      }
    }

    console.log("Sample orders created")

    // Create wallet entries for users
    const allUsers = await query("SELECT id, user_type FROM users")

    for (const user of allUsers.rows) {
      await query(
        `
        INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
      `,
        [user.id, 0.0, 0.0, 0.0],
      )

      // Add some sample transactions for sales agents
      if (user.user_type === "sales_agent") {
        await query(
          `
          UPDATE wallets SET balance = $1, total_earned = $2 WHERE user_id = $3
        `,
          [2500.0, 5000.0, user.id],
        )

        // Add sample wallet transactions
        const transactions = [
          {
            type: "commission",
            amount: 1500.0,
            description: "Commission from order ORD-2024-001",
            reference: "COMM-001",
          },
          {
            type: "commission",
            amount: 2000.0,
            description: "Commission from order ORD-2024-002",
            reference: "COMM-002",
          },
          {
            type: "withdrawal",
            amount: -1000.0,
            description: "Withdrawal to M-Pesa",
            reference: "WTH-001",
          },
        ]

        for (const transaction of transactions) {
          await query(
            `
            INSERT INTO wallet_transactions (
              user_id, transaction_type, amount, description, 
              reference_number, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
            [
              user.id,
              transaction.type,
              transaction.amount,
              transaction.description,
              transaction.reference,
              "completed",
            ],
          )
        }
      }
    }

    console.log("Wallets and transactions created")

    // Create sample purchase orders
    if (Object.keys(supplierIds).length > 0) {
      const supplierId = Object.values(supplierIds)[0]

      const poResult = await query(
        `
        INSERT INTO purchase_orders (
          supplier_id, po_number, po_status, subtotal, tax_amount,
          total_amount, expected_delivery_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
        [
          supplierId,
          "PO-2024-001",
          "pending",
          5000.0,
          800.0,
          5800.0,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          "Initial stock purchase",
        ],
      )

      if (poResult.rows.length > 0) {
        const poId = poResult.rows[0].id

        // Add PO items
        const productResults = await query("SELECT id, unit_price FROM products LIMIT 2")

        for (const product of productResults.rows) {
          const quantity = Math.floor(Math.random() * 20) + 10

          await query(
            `
            INSERT INTO purchase_order_items (
              po_id, product_id, quantity, unit_price, total_price
            ) VALUES ($1, $2, $3, $4, $5)
          `,
            [poId, product.id, quantity, product.unit_price, quantity * product.unit_price],
          )
        }
      }
    }

    console.log("Purchase orders created")

    // Create sample invoices
    const invoiceResult = await query(
      `
      INSERT INTO invoices (
        customer_id, invoice_number, invoice_status, subtotal,
        tax_amount, total_amount, due_date, payment_terms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
      [
        customerUser.rows[0]?.id,
        "INV-2024-001",
        "pending",
        2000.0,
        320.0,
        2320.0,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        "30 days",
      ],
    )

    console.log("Sample invoices created")

    // Create sample quote requests
    if (customerUser.rows.length > 0) {
      await query(
        `
        INSERT INTO quote_requests (
          customer_id, request_number, status, description,
          required_date, budget_range
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          customerUser.rows[0].id,
          "QR-2024-001",
          "pending",
          "Need bulk stationery supplies for office setup",
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          "50000-100000",
        ],
      )
    }

    console.log("Quote requests created")

    // Create system settings
    const settings = [
      { key: "tax_rate", value: "16", description: "VAT tax rate percentage" },
      { key: "currency", value: "KES", description: "Default currency" },
      { key: "commission_rate", value: "5", description: "Sales agent commission percentage" },
      { key: "min_order_amount", value: "500", description: "Minimum order amount" },
      { key: "free_shipping_threshold", value: "5000", description: "Free shipping threshold amount" },
      { key: "company_name", value: "FirstCraft Ltd", description: "Company name" },
      { key: "company_email", value: "info@firstcraft.com", description: "Company email" },
      { key: "company_phone", value: "+254700000000", description: "Company phone" },
    ]

    for (const setting of settings) {
      await query(
        `
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description
      `,
        [setting.key, setting.value, setting.description],
      )
    }

    console.log("System settings created")

    console.log("Database seeding completed successfully!")
    console.log("\nDefault login credentials:")
    console.log("Admin: admin@firstcraft.com / admin123")
    console.log("Sales Agent: agent@firstcraft.com / agent123")
    console.log("Customer: customer@example.com / customer123")
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seeding failed:", error)
      process.exit(1)
    })
}

export default seedDatabase
