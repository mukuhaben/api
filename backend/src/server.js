console.log("💡 This is the real server.js file");


import express from "express"
import cors from "cors"
import compression from "compression"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"

// Load environment variables adjusted to tells Node to load .env.production when NODE_ENV=production
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "local"}`,
})

// Import configurations and middlewares
import { testConnection } from "./config/database.js"
import { globalErrorHandler, AppError } from "./middlewares/errorHandler.js"
import { securityHeaders, corsOptions, apiLimiter, sanitizeInput } from "./middlewares/security.js"

// Import routes
import authRoutes from "./routes/auth.js"
import productRoutes from "./routes/product.js"
import categoryRoutes from "./routes/categories.js"
import orderRoutes from "./routes/orders.js"
import paymentRoutes from "./routes/payment.js"
import walletRoutes from "./routes/wallet.js"
import supplierRoutes from "./routes/suppliers.js"
import salesAgentRoutes from "./routes/salesAgent.js"
import userRoutes from "./routes/users.js"
import uploadRoutes from "./routes/upload.js"
import cmsRoutes from './routes/cms.js'; // adjust path if needed


const app = express()

// Trust proxy for rate limiting
app.set("trust proxy", 1)

// Security middleware
app.use(securityHeaders)
app.use(compression())

// CORS configuration
app.use(cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(morgan("combined"))
}

// Input sanitization
app.use(sanitizeInput)

// Rate limiting
app.use("/api/", apiLimiter)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  })
})

app.get('/', (req, res)=>{
  res.json({message: "Welcome to firstcraft."});
});

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/wallet", walletRoutes)
app.use("/api/suppliers", supplierRoutes)
app.use("/api/sales-agents", salesAgentRoutes)
app.use("/api/users", userRoutes)
app.use("/api/upload", uploadRoutes)
app.use('/api/cms', cmsRoutes)


// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})

// Global error handling middleware
app.use(globalErrorHandler)

const PORT = process.env.PORT || 3000

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection()
    console.log("✅ Database connected successfully")

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`)

      // Show correct API URL based on environment
      const apiUrl =
        process.env.NODE_ENV === "production"
          ? `https://firstcraft-backend-q68n.onrender.com/api`
          : `http://localhost:${PORT}/api`

      console.log(`🔗 API Base URL: ${apiUrl}`)

      if (process.env.NODE_ENV === "development") {
        console.log(`📋 Health Check: http://localhost:${PORT}/health`)
        console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL}`)
      } else {
        console.log(`📋 Health Check: https://firstcraft-backend-q68n.onrender.com/health`)
        console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL}`)
      }
    })

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)
      server.close(() => {
        console.log("✅ Server closed")
        process.exit(0)
      })
    }

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
    process.on("SIGINT", () => gracefulShutdown("SIGINT"))
  } catch (error) {
    console.error("❌ Failed to start server:", error.message)
    process.exit(1)
  }
}

startServer()

export default app
