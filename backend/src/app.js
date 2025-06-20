import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { corsOptions } from "./middlewares/security.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import routes from "./routes/routes.js"

// Load environment variables
dotenv.config()

const app = express()

// Trust proxy for deployment platforms
app.set("trust proxy", 1)

// CORS middleware
app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "FirstCraft Backend API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/health",
      api: "/api",
      docs: "/api/status",
    },
  })
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Mount API routes
app.use("/api", routes)

// Global error handler
app.use(errorHandler)

// 404 handler for non-API routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    suggestion: "Check the API documentation for available endpoints",
  })
})

export default app
