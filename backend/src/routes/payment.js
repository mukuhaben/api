import express from "express"
import axios from "axios"
import db from "../config/database.js"
import { verifyToken, requireAuthenticated } from "../middlewares/auth.js"
import { validate, schemas } from "../middlewares/validation.js"

const router = express.Router()

// M-Pesa configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: process.env.MPESA_ENVIRONMENT || "sandbox",
  passkey: process.env.MPESA_PASSKEY,
  shortcode: process.env.MPESA_SHORTCODE || "174379",
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  timeoutUrl: process.env.MPESA_TIMEOUT_URL,
}

// KCB configuration
const KCB_CONFIG = {
  apiKey: process.env.KCB_API_KEY,
  secretKey: process.env.KCB_SECRET_KEY,
  environment: process.env.KCB_ENVIRONMENT || "sandbox",
  callbackUrl: process.env.KCB_CALLBACK_URL,
}

// Get M-Pesa access token
const getMpesaAccessToken = async () => {
  try {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString("base64")
    const baseUrl =
      MPESA_CONFIG.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"

    const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    return response.data.access_token
  } catch (error) {
    console.error("M-Pesa token error:", error.response?.data || error.message)
    throw new Error("Failed to get M-Pesa access token")
  }
}

// Format phone number for M-Pesa
const formatPhoneNumber = (phone) => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "")

  // Handle different formats
  if (cleaned.startsWith("254")) {
    return cleaned
  } else if (cleaned.startsWith("0")) {
    return "254" + cleaned.substring(1)
  } else if (cleaned.length === 9) {
    return "254" + cleaned
  }

  throw new Error("Invalid phone number format")
}

// Initiate M-Pesa STK Push
router.post(
  "/mpesa/stk-push",
  verifyToken,
  requireAuthenticated,
  validate(schemas.paymentInitiation),
  async (req, res) => {
    try {
      const { orderId, phoneNumber } = req.body

      // Get order details
      const orderResult = await db.query(
        "SELECT id, order_number, total_amount, customer_id FROM orders WHERE id = $1 AND customer_id = $2",
        [orderId, req.user.id],
      )

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }

      const order = orderResult.rows[0]
      const amount = Math.round(order.total_amount)
      const formattedPhone = formatPhoneNumber(phoneNumber)

      // Get M-Pesa access token
      const accessToken = await getMpesaAccessToken()

      // Generate timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, -3)

      // Generate password
      const password = Buffer.from(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`).toString("base64")

      const baseUrl =
        MPESA_CONFIG.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"

      // STK Push request
      const stkPushData = {
        BusinessShortCode: MPESA_CONFIG.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_CONFIG.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CONFIG.callbackUrl,
        AccountReference: order.order_number,
        TransactionDesc: `Payment for order ${order.order_number}`,
      }

      const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, stkPushData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      // Save payment record
      const paymentResult = await db.query(
        `
      INSERT INTO payments (
        order_id, payment_method, payment_provider, amount, currency,
        provider_transaction_id, provider_response, customer_phone, customer_email
      ) VALUES ($1, 'mpesa', 'safaricom', $2, 'KES', $3, $4, $5, $6)
      RETURNING id
    `,
        [
          orderId,
          amount,
          response.data.CheckoutRequestID,
          JSON.stringify(response.data),
          formattedPhone,
          req.user.email,
        ],
      )

      res.json({
        success: true,
        message: "STK Push initiated successfully",
        data: {
          paymentId: paymentResult.rows[0].id,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
        },
      })
    } catch (error) {
      console.error("M-Pesa STK Push error:", error.response?.data || error.message)
      res.status(500).json({
        success: false,
        message: "Failed to initiate M-Pesa payment",
      })
    }
  },
)

// M-Pesa callback handler
router.post("/mpesa/callback", async (req, res) => {
  try {
    console.log("M-Pesa callback received:", JSON.stringify(req.body, null, 2))

    const { Body } = req.body
    const { stkCallback } = Body

    const checkoutRequestId = stkCallback.CheckoutRequestID
    const resultCode = stkCallback.ResultCode
    const resultDesc = stkCallback.ResultDesc

    // Find payment record
    const paymentResult = await db.query("SELECT id, order_id FROM payments WHERE provider_transaction_id = $1", [
      checkoutRequestId,
    ])

    if (paymentResult.rows.length === 0) {
      console.error("Payment not found for CheckoutRequestID:", checkoutRequestId)
      return res.status(200).json({ success: true })
    }

    const payment = paymentResult.rows[0]

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata
      const items = callbackMetadata.Item

      let mpesaReceiptNumber = ""
      let transactionDate = ""
      let phoneNumber = ""

      items.forEach((item) => {
        switch (item.Name) {
          case "MpesaReceiptNumber":
            mpesaReceiptNumber = item.Value
            break
          case "TransactionDate":
            transactionDate = item.Value
            break
          case "PhoneNumber":
            phoneNumber = item.Value
            break
        }
      })

      // Update payment status
      await db.query(
        `
        UPDATE payments 
        SET status = 'completed', 
            provider_reference = $1,
            provider_response = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [mpesaReceiptNumber, JSON.stringify(stkCallback), payment.id],
      )

      // Update order payment status
      await db.query("UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        "paid",
        payment.order_id,
      ])

      // Add cashback to wallet
      await db.transaction(async (client) => {
        // Get order details
        const orderResult = await client.query(
          "SELECT customer_id, cashback_amount, order_number FROM orders WHERE id = $1",
          [payment.order_id],
        )

        if (orderResult.rows.length > 0) {
          const { customer_id, cashback_amount, order_number } = orderResult.rows[0]

          if (cashback_amount > 0) {
            // Get current wallet balance
            const balanceResult = await client.query(
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
              [customer_id],
            )

            const currentBalance = Number.parseFloat(balanceResult.rows[0].balance) || 0
            const newBalance = currentBalance + cashback_amount

            // Add cashback to wallet
            await client.query(
              `
              INSERT INTO wallet_transactions (
                user_id, transaction_type, amount, balance_before, balance_after,
                reference_type, reference_id, order_id, description
              ) VALUES ($1, 'cashback', $2, $3, $4, 'order', $5, $5, $6)
            `,
              [
                customer_id,
                cashback_amount,
                currentBalance,
                newBalance,
                payment.order_id,
                `Cashback for order ${order_number}`,
              ],
            )
          }
        }
      })
    } else {
      // Payment failed
      await db.query(
        `
        UPDATE payments 
        SET status = 'failed', 
            failure_reason = $1,
            provider_response = $2,
            failed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [resultDesc, JSON.stringify(stkCallback), payment.id],
      )

      // Update order payment status
      await db.query("UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        "failed",
        payment.order_id,
      ])
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("M-Pesa callback error:", error)
    res.status(200).json({ success: true }) // Always return 200 to M-Pesa
  }
})

// M-Pesa timeout handler
router.post("/mpesa/timeout", async (req, res) => {
  try {
    console.log("M-Pesa timeout received:", JSON.stringify(req.body, null, 2))

    const { CheckoutRequestID } = req.body

    // Update payment status to failed
    await db.query(
      `
      UPDATE payments 
      SET status = 'failed', 
          failure_reason = 'Transaction timeout',
          provider_response = $1,
          failed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE provider_transaction_id = $2
    `,
      [JSON.stringify(req.body), CheckoutRequestID],
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("M-Pesa timeout error:", error)
    res.status(200).json({ success: true })
  }
})

// Check payment status
router.get("/status/:paymentId", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { paymentId } = req.params

    const result = await db.query(
      `
      SELECT p.*, o.order_number, o.customer_id
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = $1 AND o.customer_id = $2
    `,
      [paymentId, req.user.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    const payment = result.rows[0]

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: payment.order_id,
        orderNumber: payment.order_number,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        providerReference: payment.provider_reference,
        initiatedAt: payment.initiated_at,
        completedAt: payment.completed_at,
        failedAt: payment.failed_at,
        failureReason: payment.failure_reason,
      },
    })
  } catch (error) {
    console.error("Get payment status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get payment status",
    })
  }
})

// Initiate KCB payment
router.post("/kcb/initiate", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { orderId, phoneNumber } = req.body

    // Get order details
    const orderResult = await db.query(
      "SELECT id, order_number, total_amount, customer_id FROM orders WHERE id = $1 AND customer_id = $2",
      [orderId, req.user.id],
    )

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    const order = orderResult.rows[0]
    const amount = Math.round(order.total_amount)
    const formattedPhone = formatPhoneNumber(phoneNumber)

    // KCB API integration (placeholder - implement based on KCB API documentation)
    const kcbPaymentData = {
      amount: amount,
      phoneNumber: formattedPhone,
      reference: order.order_number,
      description: `Payment for order ${order.order_number}`,
      callbackUrl: KCB_CONFIG.callbackUrl,
    }

    // For demo purposes, simulate KCB response
    const mockKcbResponse = {
      transactionId: `KCB${Date.now()}`,
      status: "pending",
      message: "Payment initiated successfully",
    }

    // Save payment record
    const paymentResult = await db.query(
      `
      INSERT INTO payments (
        order_id, payment_method, payment_provider, amount, currency,
        provider_transaction_id, provider_response, customer_phone, customer_email
      ) VALUES ($1, 'kcb', 'kcb_bank', $2, 'KES', $3, $4, $5, $6)
      RETURNING id
    `,
      [orderId, amount, mockKcbResponse.transactionId, JSON.stringify(mockKcbResponse), formattedPhone, req.user.email],
    )

    res.json({
      success: true,
      message: "KCB payment initiated successfully",
      data: {
        paymentId: paymentResult.rows[0].id,
        transactionId: mockKcbResponse.transactionId,
        status: mockKcbResponse.status,
        message: mockKcbResponse.message,
      },
    })
  } catch (error) {
    console.error("KCB payment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to initiate KCB payment",
    })
  }
})

// KCB callback handler
router.post("/kcb/callback", async (req, res) => {
  try {
    console.log("KCB callback received:", JSON.stringify(req.body, null, 2))

    const { transactionId, status, reference } = req.body

    // Find payment record
    const paymentResult = await db.query("SELECT id, order_id FROM payments WHERE provider_transaction_id = $1", [
      transactionId,
    ])

    if (paymentResult.rows.length === 0) {
      console.error("Payment not found for transaction ID:", transactionId)
      return res.status(200).json({ success: true })
    }

    const payment = paymentResult.rows[0]

    if (status === "success") {
      // Payment successful
      await db.query(
        `
        UPDATE payments 
        SET status = 'completed', 
            provider_reference = $1,
            provider_response = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [reference, JSON.stringify(req.body), payment.id],
      )

      // Update order payment status
      await db.query("UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        "paid",
        payment.order_id,
      ])
    } else {
      // Payment failed
      await db.query(
        `
        UPDATE payments 
        SET status = 'failed', 
            failure_reason = $1,
            provider_response = $2,
            failed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [req.body.message || "Payment failed", JSON.stringify(req.body), payment.id],
      )

      // Update order payment status
      await db.query("UPDATE orders SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        "failed",
        payment.order_id,
      ])
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("KCB callback error:", error)
    res.status(200).json({ success: true })
  }
})

// Get payment history
router.get("/history", verifyToken, requireAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    const query = `
      SELECT 
        p.*,
        o.order_number,
        o.total_amount as order_total
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.customer_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await db.query(query, [req.user.id, limit, offset])

    // Get total count
    const countResult = await db.query(
      `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.customer_id = $1
    `,
      [req.user.id],
    )

    const total = Number.parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Get payment history error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    })
  }
})

export default router
