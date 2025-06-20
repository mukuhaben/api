const mpesaService = require("./mpesaService")
const kcbService = require("./kcbService")
const db = require("../src/config/database")

class PaymentService {
  async processPayment(paymentData) {
    const { method, phoneNumber, amount, orderId, userId, accountReference } = paymentData

    try {
      // Create payment record
      const paymentResult = await db.query(
        `
        INSERT INTO payments (
          order_id, user_id, payment_method, amount, status,
          phone_number, account_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
        [orderId, userId, method, amount, "pending", phoneNumber, accountReference],
      )

      const paymentId = paymentResult.rows[0].id
      let result

      switch (method.toLowerCase()) {
        case "mpesa":
          result = await mpesaService.initiateSTKPush(
            phoneNumber,
            amount,
            accountReference,
            `Payment for order ${accountReference}`,
          )
          break

        case "kcb":
          result = await kcbService.initiatePayment(
            phoneNumber,
            amount,
            accountReference,
            `Payment for order ${accountReference}`,
          )
          break

        default:
          throw new Error("Unsupported payment method")
      }

      if (result.success) {
        // Update payment with external reference
        await db.query(
          `
          UPDATE payments SET 
            external_reference = $1,
            provider_response = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `,
          [result.checkoutRequestId || result.transactionId, JSON.stringify(result.data), paymentId],
        )

        return {
          success: true,
          paymentId,
          externalReference: result.checkoutRequestId || result.transactionId,
          message: "Payment initiated successfully",
        }
      } else {
        // Update payment status to failed
        await db.query(
          `
          UPDATE payments SET 
            status = 'failed',
            failure_reason = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
          [JSON.stringify(result.error), paymentId],
        )

        return {
          success: false,
          error: result.error,
          message: "Payment initiation failed",
        }
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      return {
        success: false,
        error: error.message,
        message: "Payment processing failed",
      }
    }
  }

  async handlePaymentCallback(callbackData, method) {
    try {
      let externalReference, status, transactionId

      if (method === "mpesa") {
        const { Body } = callbackData
        const stkCallback = Body.stkCallback

        externalReference = stkCallback.CheckoutRequestID
        status = stkCallback.ResultCode === 0 ? "completed" : "failed"

        if (status === "completed" && stkCallback.CallbackMetadata) {
          const metadata = stkCallback.CallbackMetadata.Item
          const receiptNumber = metadata.find((item) => item.Name === "MpesaReceiptNumber")
          transactionId = receiptNumber ? receiptNumber.Value : null
        }
      } else if (method === "kcb") {
        externalReference = callbackData.requestId
        status = callbackData.status === "SUCCESS" ? "completed" : "failed"
        transactionId = callbackData.transactionId
      }

      // Update payment status
      const updateResult = await db.query(
        `
        UPDATE payments SET 
          status = $1,
          transaction_id = $2,
          provider_response = $3,
          completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE external_reference = $4
        RETURNING id, order_id, user_id, amount
      `,
        [status, transactionId, JSON.stringify(callbackData), externalReference],
      )

      if (updateResult.rows.length > 0) {
        const payment = updateResult.rows[0]

        if (status === "completed") {
          // Update order status
          await db.query(
            `
            UPDATE orders SET 
              payment_status = 'paid',
              order_status = 'confirmed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
            [payment.order_id],
          )

          // Process commission for sales agent if applicable
          await this.processCommission(payment.order_id, payment.amount)
        }

        return { success: true, payment }
      }

      return { success: false, error: "Payment not found" }
    } catch (error) {
      console.error("Payment callback processing error:", error)
      return { success: false, error: error.message }
    }
  }

  async processCommission(orderId, orderAmount) {
    try {
      // Get order with sales agent info
      const orderResult = await db.query(
        `
        SELECT o.sales_agent_id, s.commission_rate
        FROM orders o
        LEFT JOIN system_settings s ON s.setting_key = 'commission_rate'
        WHERE o.id = $1 AND o.sales_agent_id IS NOT NULL
      `,
        [orderId],
      )

      if (orderResult.rows.length > 0) {
        const { sales_agent_id, commission_rate } = orderResult.rows[0]
        const commissionAmount = (orderAmount * (Number.parseFloat(commission_rate) || 5)) / 100

        // Update agent wallet
        await db.query(
          `
          UPDATE wallets SET 
            balance = balance + $1,
            total_earned = total_earned + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `,
          [commissionAmount, sales_agent_id],
        )

        // Create wallet transaction
        await db.query(
          `
          INSERT INTO wallet_transactions (
            user_id, transaction_type, amount, description,
            reference_number, status, order_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            sales_agent_id,
            "commission",
            commissionAmount,
            `Commission from order #${orderId}`,
            `COMM-${orderId}-${Date.now()}`,
            "completed",
            orderId,
          ],
        )
      }
    } catch (error) {
      console.error("Commission processing error:", error)
    }
  }

  async processWithdrawal(userId, amount, phoneNumber, method = "mpesa") {
    try {
      // Check wallet balance
      const walletResult = await db.query(
        `
        SELECT balance FROM wallets WHERE user_id = $1
      `,
        [userId],
      )

      if (walletResult.rows.length === 0 || walletResult.rows[0].balance < amount) {
        return {
          success: false,
          error: "Insufficient balance",
        }
      }

      // Create withdrawal record
      const withdrawalResult = await db.query(
        `
        INSERT INTO wallet_transactions (
          user_id, transaction_type, amount, description,
          reference_number, status, phone_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, reference_number
      `,
        [userId, "withdrawal", -amount, "Wallet withdrawal", `WTH-${userId}-${Date.now()}`, "pending", phoneNumber],
      )

      const { id: transactionId, reference_number } = withdrawalResult.rows[0]
      let result

      // Process withdrawal based on method
      if (method === "mpesa") {
        // For M-Pesa, we would typically use B2C API
        // This is a simplified implementation
        result = { success: true, transactionId: `MPESA-${transactionId}` }
      } else if (method === "kcb") {
        result = await kcbService.processWithdrawal(phoneNumber, amount, reference_number)
      }

      if (result.success) {
        // Update wallet balance
        await db.query(
          `
          UPDATE wallets SET 
            balance = balance - $1,
            total_withdrawn = total_withdrawn + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
        `,
          [amount, userId],
        )

        // Update transaction status
        await db.query(
          `
          UPDATE wallet_transactions SET 
            status = 'completed',
            external_reference = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
          [result.transactionId, transactionId],
        )

        return {
          success: true,
          transactionId,
          message: "Withdrawal processed successfully",
        }
      } else {
        // Update transaction status to failed
        await db.query(
          `
          UPDATE wallet_transactions SET 
            status = 'failed',
            failure_reason = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
          [JSON.stringify(result.error), transactionId],
        )

        return {
          success: false,
          error: result.error,
          message: "Withdrawal processing failed",
        }
      }
    } catch (error) {
      console.error("Withdrawal processing error:", error)
      return {
        success: false,
        error: error.message,
        message: "Withdrawal processing failed",
      }
    }
  }
}

module.exports = new PaymentService()
