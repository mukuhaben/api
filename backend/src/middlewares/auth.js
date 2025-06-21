// import jwt from "jsonwebtoken"
// import { query } from "../config/database.js"

// // Rate limiting store (in production, use Redis)
// const rateLimitStore = new Map()

// // Rate limiting middleware
// const rateLimit = (maxAttempts = 10, windowMs = 15 * 60 * 1000) => {
//   return (req, res, next) => {
//     const key = req.ip || req.connection.remoteAddress
//     const now = Date.now()

//     if (!rateLimitStore.has(key)) {
//       rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
//       return next()
//     }

//     const record = rateLimitStore.get(key)

//     if (now > record.resetTime) {
//       record.count = 1
//       record.resetTime = now + windowMs
//       return next()
//     }

//     if (record.count >= maxAttempts) {
//       return res.status(429).json({
//         success: false,
//         message: "Too many requests. Please try again later.",
//         retryAfter: Math.ceil((record.resetTime - now) / 1000),
//       })
//     }

//     record.count++
//     next()
//   }
// }

// // Verify JWT token with better error handling
// const verifyToken = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         success: false,
//         message: "Access token required",
//         code: "TOKEN_MISSING",
//       })
//     }

//     const token = authHeader.substring(7)

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token format",
//         code: "TOKEN_INVALID",
//       })
//     }

//     let decoded
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET)
//     } catch (jwtError) {
//       if (jwtError.name === "TokenExpiredError") {
//         return res.status(401).json({
//           success: false,
//           message: "Token expired",
//           code: "TOKEN_EXPIRED",
//         })
//       }

//       return res.status(401).json({
//         success: false,
//         message: "Invalid token",
//         code: "TOKEN_INVALID",
//       })
//     }

//     // Get user from database
//     const result = await query("SELECT id, username, email, user_type, is_active FROM users WHERE id = $1", [
//       decoded.userId,
//     ])

//     if (result.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "User not found",
//         code: "USER_NOT_FOUND",
//       })
//     }

//     const user = result.rows[0]

//     if (!user.is_active) {
//       return res.status(401).json({
//         success: false,
//         message: "Account is deactivated",
//         code: "ACCOUNT_DEACTIVATED",
//       })
//     }

//     req.user = user
//     next()
//   } catch (error) {
//     console.error("Auth middleware error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Authentication error",
//       code: "AUTH_ERROR",
//     })
//   }
// }

// // Check user role
// const requireRole = (roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required",
//       })
//     }

//     const userRoles = Array.isArray(roles) ? roles : [roles]

//     if (!userRoles.includes(req.user.user_type)) {
//       return res.status(403).json({
//         success: false,
//         message: "Insufficient permissions",
//       })
//     }

//     next()
//   }
// }

// // Admin only middleware
// const requireAdmin = requireRole("admin")

// // Sales agent or admin middleware
// const requireSalesAgentOrAdmin = requireRole(["sales_agent", "admin"])

// // Customer, sales agent, or admin middleware
// const requireAuthenticated = requireRole(["customer", "sales_agent", "admin"])

// // Authenticator merge from Robin code
// const authenticate = verifyToken;


// export { verifyToken, requireRole, requireAdmin, requireSalesAgentOrAdmin, requireAuthenticated, rateLimit }

// middlewares/authenticate.js

// middlewares/auth.js
import jwt from 'jsonwebtoken';
 import db from "../config/database.js";

// Authenticate and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      'SELECT id, email, first_name, last_name, user_type, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.user_type)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

const requireAdmin = requireRole('admin');
const requireSalesAgent = requireRole('sales_agent');
const requireCustomer = requireRole('customer');
const requireAuthenticated = requireRole('admin', 'sales_agent', 'customer');
const requireSalesAgentOrAdmin = requireRole('admin', 'sales_agent')
export {
  authenticate,
  requireRole,
  requireAdmin,
  requireSalesAgent,
  requireCustomer,
  requireAuthenticated,
  requireSalesAgentOrAdmin,
};

export default authenticate;
