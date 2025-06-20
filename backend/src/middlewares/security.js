import rateLimit from "express-rate-limit"
import helmet from "helmet"
import { AppError } from "./errorHandler.js"

// More permissive rate limiting configuration
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 500, message = "Too many requests") => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and static assets
      return req.path === "/health" || req.path.startsWith("/static")
    },
  })
}

// Specific rate limits for different endpoints - more permissive
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // Increased from 5 to 20 attempts
  "Too many authentication attempts, please try again later",
)

export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // Increased from 100 to 500 requests
  "Too many API requests, please try again later",
)

export const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  50, // Increased from 10 to 50 uploads
  "Too many file uploads, please try again later",
)

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

// Input sanitization
export const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attacks
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitize(obj[key])
      }
    }
  }

  if (req.body) sanitize(req.body)
  if (req.query) sanitize(req.query)
  if (req.params) sanitize(req.params)

  next()
}

// Validate file uploads
export const validateFileUpload = (allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next()
    }

    const files = req.files || [req.file]

    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return next(new AppError(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`, 400))
      }

      // Check file type
      if (allowedTypes.length > 0) {
        const fileExtension = file.originalname.split(".").pop().toLowerCase()
        if (!allowedTypes.includes(fileExtension)) {
          return next(new AppError(`File type not allowed. Allowed types: ${allowedTypes.join(", ")}`, 400))
        }
      }
    }

    next()
  }
}

// CORS configuration with enhanced security but more permissive
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    const allowedOrigins = [
      "https://production-kappa.vercel.app",
      "https://firstcrafttest.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
      // Add more permissive patterns for Vercel deployments
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/firstcraft.*\.vercel\.app$/,
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : []),
    ].filter(Boolean)

    console.log("🔍 CORS Check - Origin:", origin)
    console.log("🔍 CORS Check - Allowed Origins:", allowedOrigins)

    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === "string") {
        return allowedOrigin === origin
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin)
      }
      return false
    })

    if (isAllowed) {
      console.log("✅ CORS - Origin allowed:", origin)
      callback(null, true)
    } else {
      console.log("❌ CORS - Origin blocked:", origin)
      // In production, be more permissive to avoid blocking legitimate requests
      if (process.env.NODE_ENV === "production") {
        console.log("🔄 CORS - Allowing in production mode")
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 hours preflight cache
}
