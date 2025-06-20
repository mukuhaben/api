import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { query } from "../config/database.js"
import { AppError, catchAsync } from "../middlewares/errorHandler.js"
import { sendEmail } from "../utils/email.js"

// Generate JWT token
const signToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

// Generate refresh token
const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  })
}

// Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.user_type)
  const refreshToken = signRefreshToken(user.id)

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  }

  res.cookie("refreshToken", refreshToken, cookieOptions)

  // Remove password from output
  user.password_hash = undefined

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user,
    },
  })
}

// Register new user
export const register = catchAsync(async (req, res, next) => {
  const {
    username,
    email,
    password,
    firstName,
    lastName,
    phone,
    userType = "customer",
    companyName,
    contactPerson,
    kraPin,
    cashbackPhone,
  } = req.body

  // Check if user already exists
  const existingUser = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username])

  if (existingUser.rows.length > 0) {
    return next(new AppError("User with this email or username already exists", 400))
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))

  // Create user
  const result = await query(
    `INSERT INTO users (
      username, email, password_hash, first_name, last_name, phone,
      user_type, company_name, contact_person, kra_pin, cashback_phone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, username, email, first_name, last_name, user_type, is_active`,
    [
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      phone,
      userType,
      companyName,
      contactPerson,
      kraPin,
      cashbackPhone,
    ],
  )

  const newUser = result.rows[0]

  // Create wallet for the user
  await query("INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn) VALUES ($1, 0, 0, 0)", [
    newUser.id,
  ])

  // Send welcome email
  try {
    await sendEmail({
      email: newUser.email,
      subject: "Welcome to FirstCraft!",
      message: `Welcome ${newUser.first_name}! Your account has been created successfully.`,
    })
  } catch (error) {
    console.error("Failed to send welcome email:", error)
  }

  createSendToken(newUser, 201, res)
})

// Login user
export const login = catchAsync(async (req, res, next) => {
  const { email, password, userType = "customer" } = req.body

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400))
  }

  // Check if user exists and password is correct
  const result = await query("SELECT * FROM users WHERE email = $1 AND user_type = $2", [email, userType])

  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return next(new AppError("Incorrect email or password", 401))
  }

  // Check if user is active
  if (!user.is_active) {
    return next(new AppError("Your account has been deactivated. Please contact support.", 401))
  }

  // Update last login
  await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

  createSendToken(user, 200, res)
})

// Logout user
export const logout = (req, res) => {
  res.cookie("refreshToken", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
}

// Refresh token
export const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.cookies

  if (!refreshToken) {
    return next(new AppError("No refresh token provided", 401))
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

  // Get user
  const result = await query("SELECT id, username, email, user_type, is_active FROM users WHERE id = $1", [decoded.id])

  const user = result.rows[0]

  if (!user || !user.is_active) {
    return next(new AppError("User not found or inactive", 401))
  }

  createSendToken(user, 200, res)
})

// Forgot password
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body

  // Get user based on email
  const result = await query("SELECT * FROM users WHERE email = $1", [email])
  const user = result.rows[0]

  if (!user) {
    return next(new AppError("There is no user with that email address", 404))
  }

  // Generate random reset token
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const passwordResetToken = await bcrypt.hash(resetToken, 12)
  const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Save reset token to database
  await query("UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3", [
    passwordResetToken,
    passwordResetExpires,
    user.id,
  ])

  // Send reset email
  try {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email!`,
    })

    res.status(200).json({
      success: true,
      message: "Token sent to email!",
    })
  } catch (error) {
    await query("UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1", [user.id])

    return next(new AppError("There was an error sending the email. Try again later.", 500))
  }
})

// Reset password
export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params
  const { password } = req.body

  // Get user based on token
  const result = await query("SELECT * FROM users WHERE password_reset_expires > $1", [new Date()])

  let user = null
  for (const u of result.rows) {
    if (u.password_reset_token && (await bcrypt.compare(token, u.password_reset_token))) {
      user = u
      break
    }
  }

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400))
  }

  // Update password
  const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))
  await query(
    "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
    [hashedPassword, user.id],
  )

  createSendToken(user, 200, res)
})

// Update password
export const updatePassword = catchAsync(async (req, res, next) => {
  const { passwordCurrent, password } = req.body

  // Get user from database
  const result = await query("SELECT * FROM users WHERE id = $1", [req.user.id])
  const user = result.rows[0]

  // Check if current password is correct
  if (!(await bcrypt.compare(passwordCurrent, user.password_hash))) {
    return next(new AppError("Your current password is incorrect", 401))
  }

  // Update password
  const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, user.id])

  createSendToken(user, 200, res)
})
