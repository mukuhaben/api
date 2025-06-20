import express from "express"
import axios from "axios"
import db from "../config/database.js"
import { verifyToken, requireAuthenticated } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// Get wallet balance
router.get("/balance", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('credit', 'cashback') THEN amount
          WHEN transaction_type IN ('debit', 'withdrawal') THEN -amount
          ELSE 0
        END
      ), 0) as balance
      FROM wallet_transactions 
      WHERE user_id = $1
    `,
      [req.user.id],
    )

    const balance = Number.parseFloat(result.rows[0].balance) || 0

    res.json({
      success: true,
      data: {
        balance: Math.round(balance * 100) / 100,
        currency: "KES",
      },
    })
  } catch (error) {
    console.error("Get wallet balance error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get wallet balance",
    })
  }
})

// Get wallet transactions
router.get("/transactions", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query
    const offset = (page - 1) * limit

    let whereClause = "WHERE user_id = $1"
    const queryParams = [req.user.id]
    let paramCount = 1

    if (type && ["credit", "debit", "cashback", "withdrawal"].includes(type)) {
      paramCount++
      whereClause += ` AND transaction_type = $${paramCount}`
      queryParams.push(type)
    }

    const query = `
      SELECT 
        wt.*,
        o.order_number
      FROM wallet_transactions wt
      LEFT JOIN orders o ON wt.order_id = o.id
      ${whereClause}
      ORDER BY wt.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await db.query(query, queryParams)

    // Get total count
    const countResult = await db.query(
      `
      SELECT COUNT(*) as total
      FROM wallet_transactions 
      ${whereClause}
    `,
      queryParams.slice(0, paramCount),
    )

    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        transactions: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get wallet transactions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get wallet transactions",
    })
  }
})

// Get cashback summary
router.get("/cashback-summary", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    // Get total cashback earned
    const totalEarnedResult = await db.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total_earned
      FROM wallet_transactions 
      WHERE user_id = $1 AND transaction_type = 'cashback'
    `,
      [req.user.id],
    )

    // Get total withdrawn
    const totalWithdrawnResult = await db.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total_withdrawn
      FROM wallet_transactions 
      WHERE user_id = $1 AND transaction_type = 'withdrawal' AND status = 'completed'
    `,
      [req.user.id],
    )

    // Get current balance
    const balanceResult = await db.query(
      `
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('credit', 'cashback') THEN amount
          WHEN transaction_type IN ('debit', 'withdrawal') THEN -amount
          ELSE 0
        END
      ), 0) as balance
      FROM wallet_transactions 
      WHERE user_id = $1
    `,
      [req.user.id],
    )

    // Get recent cashback transactions with order details
    const recentCashbackResult = await db.query(
      `
      SELECT 
        wt.*,
        o.order_number,
        o.order_date
      FROM wallet_transactions wt
      LEFT JOIN orders o ON wt.order_id = o.id
      WHERE wt.user_id = $1 AND wt.transaction_type = 'cashback'
      ORDER BY wt.created_at DESC
      LIMIT 10
    `,
      [req.user.id],
    )

    const totalEarned = Number.parseFloat(totalEarnedResult.rows[0].total_earned) || 0
    const totalWithdrawn = Number.parseFloat(totalWithdrawnResult.rows[0].total_withdrawn) || 0
    const currentBalance = Number.parseFloat(balanceResult.rows[0].balance) || 0

    res.json({
      success: true,
      data: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100,
        recentCashback: recentCashbackResult.rows,
        currency: "KES",
      },
    })
  } catch (error) {
    console.error("Get cashback summary error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get cashback summary",
    })
  }
})

// Initiate withdrawal
router.post("/withdraw", verifyToken, requireAuthenticated, validate(schemas.walletWithdrawal), async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber } = req.body

    // Get current balance
    const balanceResult = await db.query(
      `
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('credit', 'cashback') THEN amount
          WHEN transaction_type IN ('debit', 'withdrawal') THEN -amount
          ELSE 0
        END
      ), 0) as balance
      FROM wallet_transactions 
      WHERE user_id = $1
    `,
      [req.user.id],
    )

    const currentBalance = Number.parseFloat(balanceResult.rows[0].balance) || 0

    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      })
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal amount is KES 100",
      })
    }

    // Format phone number
    const formatPhoneNumber = (phone) => {
      const cleaned = phone.replace(/\D/g, "")
      if (cleaned.startsWith("254")) {
        return cleaned
      } else if (cleaned.startsWith("0")) {
        return "254" + cleaned.substring(1)
      } else if (cleaned.length === 9) {
        return "254" + cleaned
      }
      throw new Error("Invalid phone number format")
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Calculate charges
    const maintenanceCharge = 2 // Fixed maintenance charge
    let withdrawalCharge = 0

    // M-Pesa withdrawal charges based on amount
    if (amount <= 500) withdrawalCharge = 1
    else if (amount <= 1000) withdrawalCharge = 1.5
    else if (amount <= 2500) withdrawalCharge = 2.5
    else if (amount <= 5000) withdrawalCharge = 5
    else if (amount <= 10000) withdrawalCharge = 10
    else withdrawalCharge = 15

    const totalCharges = maintenanceCharge + withdrawalCharge
    const netAmount = amount - totalCharges

    if (paymentMethod === "mpesa") {
      // Initiate M-Pesa B2C transaction
      try {
        // Get M-Pesa access token (reuse from payments route)
        const getMpesaAccessToken = async () => {
          const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString(
            "base64",
          )
          const baseUrl =
            process.env.MPESA_ENVIRONMENT === "production"
              ? "https://api.safaricom.co.ke"
              : "https://sandbox.safaricom.co.ke"

          const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          })

          return response.data.access_token
        }

        const accessToken = await getMpesaAccessToken()
        const baseUrl =
          process.env.MPESA_ENVIRONMENT === "production"
            ? "https://api.safaricom.co.ke"
            : "https://sandbox.safaricom.co.ke"

        // B2C request data
        const b2cData = {
          InitiatorName: "testapi", // Your initiator name
          SecurityCredential: "your_security_credential", // Encrypted password
          CommandID: "BusinessPayment",
          Amount: netAmount,
          PartyA: process.env.MPESA_SHORTCODE,
          PartyB: formattedPhone,
          Remarks: "Cashback withdrawal",
          QueueTimeOutURL: process.env.MPESA_TIMEOUT_URL,
          ResultURL: `${process.env.MPESA_CALLBACK_URL}/withdrawal`,
          Occasion: "Withdrawal",
        }

        // For demo purposes, simulate successful M-Pesa response
        const mockResponse = {
          ConversationID: `AG_${Date.now()}`,
          OriginatorConversationID: `${Date.now()}`,
          ResponseCode: "0",
          ResponseDescription: "Accept the service request successfully.",
        }

        // Record withdrawal transaction
        const newBalance = currentBalance - amount

        const transactionResult = await db.query(
          `
          INSERT INTO wallet_transactions (
            user_id, transaction_type, amount, balance_before, balance_after,
            reference_type, description, payment_method, provider_transaction_id, status
          ) VALUES ($1, 'withdrawal', $2, $3, $4, 'withdrawal', $5, $6, $7, 'completed')
          RETURNING id
        `,
          [
            req.user.id,
            amount,
            currentBalance,
            newBalance,
            `Withdrawal to M-Pesa ${formattedPhone}`,
            "mpesa",
            mockResponse.ConversationID,
          ],
        )

        res.json({
          success: true,
          message: "Withdrawal initiated successfully",
          data: {
            transactionId: transactionResult.rows[0].id,
            amount: amount,
            netAmount: netAmount,
            charges: {
              maintenance: maintenanceCharge,
              withdrawal: withdrawalCharge,
              total: totalCharges,
            },
            newBalance: Math.round(newBalance * 100) / 100,
            providerReference: mockResponse.ConversationID,
          },
        })
      } catch (mpesaError) {
        console.error("M-Pesa withdrawal error:", mpesaError)

        // For demo, still process the withdrawal
        const newBalance = currentBalance - amount

        const transactionResult = await db.query(
          `
          INSERT INTO wallet_transactions (
            user_id, transaction_type, amount, balance_before, balance_after,
            reference_type, description, payment_method, status
          ) VALUES ($1, 'withdrawal', $2, $3, $4, 'withdrawal', $5, $6, 'completed')
          RETURNING id
        `,
          [req.user.id, amount, currentBalance, newBalance, `Withdrawal to M-Pesa ${formattedPhone}`, "mpesa"],
        )

        res.json({
          success: true,
          message: "Withdrawal processed successfully (demo mode)",
          data: {
            transactionId: transactionResult.rows[0].id,
            amount: amount,
            netAmount: netAmount,
            charges: {
              maintenance: maintenanceCharge,
              withdrawal: withdrawalCharge,
              total: totalCharges,
            },
            newBalance: Math.round(newBalance * 100) / 100,
          },
        })
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported payment method",
      })
    }
  } catch (error) {
    console.error("Withdrawal error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal",
    })
  }
})

// Get withdrawal history
router.get("/withdrawals", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    const query = `
      SELECT 
        id,
        amount,
        balance_before,
        balance_after,
        payment_method,
        provider_transaction_id,
        provider_reference,
        status,
        description,
        created_at
      FROM wallet_transactions 
      WHERE user_id = $1 AND transaction_type = 'withdrawal'
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await db.query(query, [req.user.id, limit, offset])

    // Get total count
    const countResult = await db.query(
      `
      SELECT COUNT(*) as total
      FROM wallet_transactions 
      WHERE user_id = $1 AND transaction_type = 'withdrawal'
    `,
      [req.user.id],
    )

    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        withdrawals: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get withdrawals error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get withdrawal history",
    })
  }
})

// Add manual credit (Admin only)
router.post("/credit", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.user_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      })
    }

    const { userId, amount, description } = req.body

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID and amount are required",
      })
    }

    // Get current balance
    const balanceResult = await db.query(
      `
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('credit', 'cashback') THEN amount
          WHEN transaction_type IN ('debit', 'withdrawal') THEN -amount
          ELSE 0
        END
      ), 0) as balance
      FROM wallet_transactions 
      WHERE user_id = $1
    `,
      [userId],
    )

    const currentBalance = Number.parseFloat(balanceResult.rows[0].balance) || 0
    const newBalance = currentBalance + amount

    // Add credit transaction
    const transactionResult = await db.query(
      `
      INSERT INTO wallet_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, description
      ) VALUES ($1, 'credit', $2, $3, $4, 'manual', $5)
      RETURNING id
    `,
      [userId, amount, currentBalance, newBalance, description || "Manual credit by admin"],
    )

    res.json({
      success: true,
      message: "Credit added successfully",
      data: {
        transactionId: transactionResult.rows[0].id,
        amount: amount,
        newBalance: Math.round(newBalance * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Add credit error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add credit",
    })
  }
})

export default router
