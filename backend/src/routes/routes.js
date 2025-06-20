import express from "express"
import authRoutes from "./auth.js"
import productRoutes from "./product.js"
import categoryRoutes from "./categories.js"
import orderRoutes from "./orders.js"
import supplierRoutes from "./suppliers.js"
import salesAgentRoutes from "./salesAgent.js"
import uploadRoutes from "./upload.js"
import walletRoutes from "./wallet.js"
import paymentRoutes from "./payment.js"
import cmsRoutes from "./cms.js"
import userRoutes from "./users.js"

const router = express.Router()

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "FirstCraft API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API status endpoint
router.get("/status", (req, res) => {
  res.json({
    api: "FirstCraft Backend API",
    version: "1.0.0",
    status: "active",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      orders: "/api/orders",
      suppliers: "/api/suppliers",
      salesAgents: "/api/sales-agents",
      users: "/api/users",
      cms: "/api/cms",
      upload: "/api/upload",
      wallet: "/api/wallet",
      payment: "/api/payment",
    },
  })
})

// Mount all routes
router.use("/auth", authRoutes)
router.use("/products", productRoutes)
router.use("/categories", categoryRoutes)
router.use("/orders", orderRoutes)
router.use("/suppliers", supplierRoutes)
router.use("/sales-agents", salesAgentRoutes)
router.use("/users", userRoutes)
router.use("/cms", cmsRoutes)
router.use("/upload", uploadRoutes)
router.use("/wallet", walletRoutes)
router.use("/payment", paymentRoutes)

// 404 handler for API routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
    availableEndpoints: [
      "/api/health",
      "/api/status",
      "/api/auth",
      "/api/products",
      "/api/categories",
      "/api/orders",
      "/api/suppliers",
      "/api/sales-agents",
      "/api/users",
      "/api/cms",
      "/api/upload",
      "/api/wallet",
      "/api/payment",
    ],
  })
})

export default router
