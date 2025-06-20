const axios = require("axios")

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET
    this.environment = process.env.MPESA_ENVIRONMENT || "sandbox"
    this.passkey = process.env.MPESA_PASSKEY
    this.shortcode = process.env.MPESA_SHORTCODE
    this.callbackUrl = process.env.MPESA_CALLBACK_URL
    this.timeoutUrl = process.env.MPESA_TIMEOUT_URL

    this.baseUrl = this.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64")

      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })

      return response.data.access_token
    } catch (error) {
      console.error("Error getting M-Pesa access token:", error.response?.data || error.message)
      throw new Error("Failed to get M-Pesa access token")
    }
  }

  generateTimestamp() {
    const now = new Date()
    return (
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0")
    )
  }

  generatePassword(timestamp) {
    const data = this.shortcode + this.passkey + timestamp
    return Buffer.from(data).toString("base64")
  }

  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc) {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword(timestamp)

      // Format phone number (remove + and ensure it starts with 254)
      let formattedPhone = phoneNumber.replace(/\+/g, "")
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1)
      }
      if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone
      }

      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      }

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        data: response.data,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
      }
    } catch (error) {
      console.error("M-Pesa STK Push error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  async querySTKPushStatus(checkoutRequestId) {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = this.generateTimestamp()
      const password = this.generatePassword(timestamp)

      const requestBody = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("M-Pesa query error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  async registerUrls() {
    try {
      const accessToken = await this.getAccessToken()

      const requestBody = {
        ShortCode: this.shortcode,
        ResponseType: "Completed",
        ConfirmationURL: this.callbackUrl,
        ValidationURL: this.callbackUrl,
      }

      const response = await axios.post(`${this.baseUrl}/mpesa/c2b/v1/registerurl`, requestBody, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("M-Pesa URL registration error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }
}

module.exports = new MpesaService()
