const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

async function verifyDatabase() {
  try {
    console.log("🔍 Checking database connection...")

    // Test connection
    const client = await pool.connect()
    console.log("✅ Database connected successfully")

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('products', 'categories', 'users', 'orders', 'cms_content');
    `

    const result = await client.query(tablesQuery)
    console.log(
      "📋 Existing tables:",
      result.rows.map((row) => row.table_name),
    )

    if (result.rows.length === 0) {
      console.log("❌ No tables found! You need to run setup-database.sql")
      console.log("🔧 Run this command in your PostgreSQL database:")
      console.log("   psql $DATABASE_URL -f livetest/scripts/setup-database.sql")
    } else if (result.rows.length < 5) {
      console.log("⚠️  Some tables missing. Expected: products, categories, users, orders, cms_content")
      console.log("🔧 You may need to run setup-database.sql again")
    } else {
      console.log("✅ All main tables exist")

      // Check if products table has data
      const productsCount = await client.query("SELECT COUNT(*) FROM products")
      console.log(`📦 Products in database: ${productsCount.rows[0].count}`)

      if (productsCount.rows[0].count === "0") {
        console.log("⚠️  Products table is empty - you may need sample data")
      }
    }

    client.release()
  } catch (error) {
    console.error("❌ Database verification failed:", error.message)
    console.log("🔧 Check your DATABASE_URL environment variable")
  } finally {
    await pool.end()
  }
}

verifyDatabase()
