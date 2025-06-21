// import bcrypt from "bcryptjs"
// import jwt from "jsonwebtoken"
// import { query } from "../config/database.js"
// import { AppError, catchAsync } from "../middlewares/errorHandler.js"
// import { sendEmail } from "../utils/email.js"

// // Generate JWT token
// const signToken = (id, userType) => {
//   return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   })
// }

// // Generate refresh token
// const signRefreshToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
//     expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
//   })
// }

// // Create and send token response
// const createSendToken = (user, statusCode, res) => {
//   const token = signToken(user.id, user.user_type)
//   const refreshToken = signRefreshToken(user.id)

//   const cookieOptions = {
//     expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "strict",
//   }

//   res.cookie("refreshToken", refreshToken, cookieOptions)

//   // Remove password from output
//   user.password_hash = undefined

//   res.status(statusCode).json({
//     success: true,
//     token,
//     data: {
//       user,
//     },
//   })
// }

// // Register new user
// export const register = catchAsync(async (req, res, next) => {
//   const {
//     username,
//     email,
//     password,
//     firstName,
//     lastName,
//     phone,
//     userType = "customer",
//     companyName,
//     contactPerson,
//     kraPin,
//     cashbackPhone,
//   } = req.body

//   // Check if user already exists
//   const existingUser = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username])

//   if (existingUser.rows.length > 0) {
//     return next(new AppError("User with this email or username already exists", 400))
//   }

//   // Hash password
//   const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))

//   // Create user
//   const result = await query(
//     `INSERT INTO users (
//       username, email, password_hash, first_name, last_name, phone,
//       user_type, company_name, contact_person, kra_pin, cashback_phone
//     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//     RETURNING id, username, email, first_name, last_name, user_type, is_active`,
//     [
//       username,
//       email,
//       hashedPassword,
//       firstName,
//       lastName,
//       phone,
//       userType,
//       companyName,
//       contactPerson,
//       kraPin,
//       cashbackPhone,
//     ],
//   )

//   const newUser = result.rows[0]

//   // Create wallet for the user
//   await query("INSERT INTO wallets (user_id, balance, total_earned, total_withdrawn) VALUES ($1, 0, 0, 0)", [
//     newUser.id,
//   ])

//   // Send welcome email
//   try {
//     await sendEmail({
//       email: newUser.email,
//       subject: "Welcome to FirstCraft!",
//       message: `Welcome ${newUser.first_name}! Your account has been created successfully.`,
//     })
//   } catch (error) {
//     console.error("Failed to send welcome email:", error)
//   }

//   createSendToken(newUser, 201, res)
// })

// // Login user
// export const login = catchAsync(async (req, res, next) => {
//   const { email, password, userType = "customer" } = req.body

//   // Check if email and password exist
//   if (!email || !password) {
//     return next(new AppError("Please provide email and password", 400))
//   }

//   // Check if user exists and password is correct
//   const result = await query("SELECT * FROM users WHERE email = $1 AND user_type = $2", [email, userType])

//   const user = result.rows[0]

//   if (!user || !(await bcrypt.compare(password, user.password_hash))) {
//     return next(new AppError("Incorrect email or password", 401))
//   }

//   // Check if user is active
//   if (!user.is_active) {
//     return next(new AppError("Your account has been deactivated. Please contact support.", 401))
//   }

//   // Update last login
//   await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

//   createSendToken(user, 200, res)
// })

// // Logout user
// export const logout = (req, res) => {
//   res.cookie("refreshToken", "loggedout", {
//     expires: new Date(Date.now() + 10 * 1000),
//     httpOnly: true,
//   })

//   res.status(200).json({
//     success: true,
//     message: "Logged out successfully",
//   })
// }

// // Refresh token
// export const refreshToken = catchAsync(async (req, res, next) => {
//   const { refreshToken } = req.cookies

//   if (!refreshToken) {
//     return next(new AppError("No refresh token provided", 401))
//   }

//   // Verify refresh token
//   const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

//   // Get user
//   const result = await query("SELECT id, username, email, user_type, is_active FROM users WHERE id = $1", [decoded.id])

//   const user = result.rows[0]

//   if (!user || !user.is_active) {
//     return next(new AppError("User not found or inactive", 401))
//   }

//   createSendToken(user, 200, res)
// })

// // Forgot password
// export const forgotPassword = catchAsync(async (req, res, next) => {
//   const { email } = req.body

//   // Get user based on email
//   const result = await query("SELECT * FROM users WHERE email = $1", [email])
//   const user = result.rows[0]

//   if (!user) {
//     return next(new AppError("There is no user with that email address", 404))
//   }

//   // Generate random reset token
//   const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
//   const passwordResetToken = await bcrypt.hash(resetToken, 12)
//   const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

//   // Save reset token to database
//   await query("UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3", [
//     passwordResetToken,
//     passwordResetExpires,
//     user.id,
//   ])

//   // Send reset email
//   try {
//     const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

//     await sendEmail({
//       email: user.email,
//       subject: "Your password reset token (valid for 10 min)",
//       message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email!`,
//     })

//     res.status(200).json({
//       success: true,
//       message: "Token sent to email!",
//     })
//   } catch (error) {
//     await query("UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1", [user.id])

//     return next(new AppError("There was an error sending the email. Try again later.", 500))
//   }
// })

// // Reset password
// export const resetPassword = catchAsync(async (req, res, next) => {
//   const { token } = req.params
//   const { password } = req.body

//   // Get user based on token
//   const result = await query("SELECT * FROM users WHERE password_reset_expires > $1", [new Date()])

//   let user = null
//   for (const u of result.rows) {
//     if (u.password_reset_token && (await bcrypt.compare(token, u.password_reset_token))) {
//       user = u
//       break
//     }
//   }

//   if (!user) {
//     return next(new AppError("Token is invalid or has expired", 400))
//   }

//   // Update password
//   const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))
//   await query(
//     "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
//     [hashedPassword, user.id],
//   )

//   createSendToken(user, 200, res)
// })

// // Update password
// export const updatePassword = catchAsync(async (req, res, next) => {
//   const { passwordCurrent, password } = req.body

//   // Get user from database
//   const result = await query("SELECT * FROM users WHERE id = $1", [req.user.id])
//   const user = result.rows[0]

//   // Check if current password is correct
//   if (!(await bcrypt.compare(passwordCurrent, user.password_hash))) {
//     return next(new AppError("Your current password is incorrect", 401))
//   }

//   // Update password
//   const hashedPassword = await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS))
//   await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, user.id])

//   createSendToken(user, 200, res)
// })
// controllers/authController.js
import bcrypt from 'bcryptjs';
import db from "../config/database.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateConfirmationToken,
  generateResetToken,
  generateRefreshToken,
} from '../utils/tokens.js';
import { sendConfirmationEmail, sendResetEmail } from '../utils/email.js';
import { hash, compare } from '../utils/passwords.js';
import { signAccess } from '../utils/tokens.js';


// Token generators
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });


export const getSalesAgents = async (_, res) => {
  try {
    const result = await db.query('SELECT id, name FROM sales_agents WHERE is_active = TRUE ORDER BY name');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req, res) => {
  const {
    first_name, last_name, username, email, password,
    phone, cashbackPhone, contactPerson, kraPin,
  } = req.body;

  // duplicates?
  const dup = await db.query(
    'SELECT 1 FROM users WHERE username=$1 OR email=$2',
    [username, email]
  );
  if (dup.rowCount) {
    return res.status(409).json({ message: 'Username or email exists' });
  }

  const passHash = await hash(password);

  const { rows } = await db.query(
    `INSERT INTO users
       (first_name,last_name,username,email,password_hash,
        phone,cashback_phone,contact_person,kra_pin)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, username, email, user_type, created_at`,
    [ first_name, last_name, username, email, passHash,
      phone || null, cashbackPhone, contactPerson || null, kraPin || null ]
  );

  //send confirmation email here

  return res.status(201).json({ message: 'Registration successful', user: rows[0] });
};

export const confirmEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Token is required' });

  try {
    const result = await db.query('SELECT email FROM users WHERE confirmation_token = $1', [token]);
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired token' });
    res.status(200).json({ message: 'Token valid', email: result.rows[0].email });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const result = await db.query('SELECT id FROM users WHERE confirmation_token = $1', [token]);
    if (!result.rows.length) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password = $1, is_confirmed = TRUE, confirmation_token = NULL WHERE confirmation_token = $2',
      [hashed, token]
    );

    res.status(200).json({ message: 'Password set successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const userRes = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) return res.status(404).json({ message: 'Email not found' });

    const { token, expiry } = generateResetToken();
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
      [token, expiry, email]
    );

    await sendResetEmail(email, userRes.rows[0].name || 'User', token);
    res.status(200).json({ message: 'Reset link sent' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyResetToken = async (req, res) => {
  const { token } = req.query;
  try {
    const result = await db.query(
      'SELECT email, reset_token_expiry FROM users WHERE reset_token = $1',
      [token]
    );
    if (!result.rows.length || new Date(result.rows[0].reset_token_expiry) < new Date())
      return res.status(400).json({ message: 'Invalid or expired token' });

    res.status(200).json({ message: 'Token valid', email: result.rows[0].email });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const userRes = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );
    if (!userRes.rows.length) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2',
      [hashed, token]
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await db.query(
      'SELECT id, password_hash, user_type FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length || !(await compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userPayload = {
      id: rows[0].id,
      role: rows[0].user_type,
      email,
    };

    const token = signAccessToken(userPayload);
    const refreshToken = signRefreshToken(userPayload);

    return res.json({
      token,          // access token
      refreshToken,   // new: refresh token
      user: userPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const refreshToken = async (req, res) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Refresh token not provided' });
  }

  try {
    // 2. Verify the refresh token using your refresh secret
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Optional: fetch user from DB using decoded.id if needed

    // 3. Generate a new access token using decoded user info
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    // 4. Respond with new access token
    res.status(200).json({ token: newAccessToken });
  } catch (err) {
    console.error('Refresh token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req, res) => {
  // Optionally blacklist token or clear refresh token in DB
  res.status(200).json({ message: 'Logged out' });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect current password' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
export const getMe = async (req, res) => {
  const { id } = req.user;
  const { rows } = await db.query(
    'SELECT id, username, email, first_name, last_name, phone, cashback_phone FROM users WHERE id=$1',
    [id]
  );
  res.json({ user: rows[0] });
};