import express from "express"
import jwt from "jsonwebtoken"
import { verifyToken } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"
import { authLimiter } from "../middlewares/security.js"
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  updatePassword,
} from "../controllers/authController.js"

const router = express.Router()

// Apply rate limiting to auth routes
router.use(authLimiter)

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" })

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  })

  return { accessToken, refreshToken }
}

// Public routes
router.post("/register", validate(schemas.userRegistration), register)
router.post("/login", validate(schemas.userLogin), login)
router.post("/logout", logout)
router.post("/refresh-token", refreshToken)
router.post("/forgot-password", forgotPassword)
router.patch("/reset-password/:token", resetPassword)

// Protected routes
router.patch("/update-password", verifyToken, updatePassword)

// Login user
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password, userType } = req.body

//     // Get user from database
//     const userResult = await query(
//       `
//       SELECT id, username, email, password_hash, user_type, is_active,
//              first_name, last_name, agent_code
//       FROM users
//       WHERE email = $1 AND user_type = $2
//     `,
//       [email, userType],
//     )

//     if (userResult.rows.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       })
//     }

//     const user = userResult.rows[0]

//     if (!user.is_active) {
//       return res.status(401).json({
//         success: false,
//         message: "Account is deactivated",
//       })
//     }

//     // For demo purposes, allow password "0000"
//     const isValidPassword = password === "0000" || (await bcrypt.compare(password, user.password_hash))

//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       })
//     }

//     // Update last login
//     await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user.id)

//     res.json({
//       success: true,
//       message: "Login successful",
//       data: {
//         user: {
//           id: user.id,
//           username: user.username,
//           email: user.email,
//           userType: user.user_type,
//           firstName: user.first_name,
//           lastName: user.last_name,
//           agentCode: user.agent_code,
//           isAdmin: user.user_type === "admin" || user.email.toLowerCase().includes("admin"),
//         },
//         tokens: {
//           accessToken,
//           refreshToken,
//         },
//       },
//     })
//   } catch (error) {
//     console.error("Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Login failed",
//     })
//   }
// })

// Refresh token
// router.post("/refresh", async (req, res) => {
//   try {
//     const { refreshToken } = req.body

//     if (!refreshToken) {
//       return res.status(401).json({
//         success: false,
//         message: "Refresh token required",
//       })
//     }

//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

//     // Check if user still exists and is active
//     const userResult = await query("SELECT id, is_active FROM users WHERE id = $1", [decoded.userId])

//     if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid refresh token",
//       })
//     }

//     // Generate new tokens
//     const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId)

//     res.json({
//       success: true,
//       data: {
//         tokens: {
//           accessToken,
//           refreshToken: newRefreshToken,
//         },
//       },
//     })
//   } catch (error) {
//     console.error("Token refresh error:", error)
//     res.status(401).json({
//       success: false,
//       message: "Invalid refresh token",
//     })
//   }
// })

// Logout (client-side token removal)
// router.post("/logout", verifyToken, async (req, res) => {
//   res.json({
//     success: true,
//     message: "Logged out successfully",
//   })
// })

// Get current user profile
// router.get("/me", verifyToken, async (req, res) => {
//   try {
//     const userResult = await query(
//       `
//       SELECT id, username, email, user_type, first_name, last_name, phone,
//              company_name, contact_person, kra_pin, cashback_phone, agent_code,
//              profile_image_url, created_at, last_login
//       FROM users
//       WHERE id = $1
//     `,
//       [req.user.id],
//     )

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       })
//     }

//     const user = userResult.rows[0]

//     res.json({
//       success: true,
//       data: {
//         user: {
//           ...user,
//           isAdmin: user.user_type === "admin" || user.email.toLowerCase().includes("admin"),
//         },
//       },
//     })
//   } catch (error) {
//     console.error("Get profile error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to get user profile",
//     })
//   }
// })

// Change password
// router.post("/change-password", verifyToken, async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Current password and new password are required",
//       })
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "New password must be at least 6 characters long",
//       })
//     }

//     // Get current password hash
//     const userResult = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id])

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       })
//     }

//     const user = userResult.rows[0]

//     // Verify current password (allow "0000" for demo)
//     const isValidPassword = currentPassword === "0000" || (await bcrypt.compare(currentPassword, user.password_hash))

//     if (!isValidPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Current password is incorrect",
//       })
//     }

//     // Hash new password
//     const saltRounds = 12
//     const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

//     // Update password
//     await query("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
//       newPasswordHash,
//       req.user.id,
//     ])

//     res.json({
//       success: true,
//       message: "Password changed successfully",
//     })
//   } catch (error) {
//     console.error("Change password error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to change password",
//     })
//   }
// })

export default router
