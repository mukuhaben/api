import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { query } from "../config/database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  try {
    console.log("Starting database migration...")

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, "../database/schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    // Split by semicolon and execute each statement
    const statements = schema.split(";").filter((stmt) => stmt.trim().length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement)
      }
    }

    console.log("Database migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

runMigrations()
