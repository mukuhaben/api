const axios = require("axios")
const crypto = require("crypto")

class KCBService {
  constructor() {
    this.apiKey = process.env.KCB_API_KEY
    this.secretKey = process.env.KCB_SECRET_KEY
    this.environment = process.env.KCB_ENVIRONMENT || "sandbox"
    this.callbackUrl = process.env.KCB_CALLBACK_URL

    this.baseUrl = this.environment === "production" ? "https://api.kcbbuni.com" : "https://sandbox-api.kcbbuni.com"
  }

  generateSignature(payload, timestamp) {
    const data = payload + timestamp + this.secretKey
    return crypto.createHash("sha256").update(data).digest("hex")
  }

  async getAccessToken() {
    try {
      const timestamp = Date.now().toString()
      const payload = JSON.stringify({
        apiKey: this.apiKey,
        timestamp: timestamp,
      })

      const signature = this.generateSignature(payload, timestamp)

      const response = await axios.post(
        `${this.baseUrl}/auth/token`,
        {
          apiKey: this.apiKey,
          timestamp: timestamp,
          signature: signature,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      return response.data.access_token
    } catch (error) {
      console.error("Error getting KCB access token:", error.response?.data || error.message)
      throw new Error("Failed to get KCB access token")
    }
  }

  async initiatePayment(phoneNumber, amount, accountReference, description) {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = Date.now().toString()

      // Format phone number for KCB
      let formattedPhone = phoneNumber.replace(/\+/g, "")
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1)
      }
      if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone
      }

      const payload = {
        phoneNumber: formattedPhone,
        amount: Math.round(amount),
        accountReference: accountReference,
        description: description,
        callbackUrl: this.callbackUrl,
        timestamp: timestamp,
      }

      const signature = this.generateSignature(JSON.stringify(payload), timestamp)

      const response = await axios.post(
        `${this.baseUrl}/payments/initiate`,
        {
          ...payload,
          signature: signature,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      return {
        success: true,
        data: response.data,
        transactionId: response.data.transactionId,
        requestId: response.data.requestId,
      }
    } catch (error) {
      console.error("KCB payment initiation error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  async queryPaymentStatus(transactionId) {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = Date.now().toString()

      const payload = {
        transactionId: transactionId,
        timestamp: timestamp,
      }

      const signature = this.generateSignature(JSON.stringify(payload), timestamp)

      const response = await axios.post(
        `${this.baseUrl}/payments/query`,
        {
          ...payload,
          signature: signature,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("KCB payment query error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  async processWithdrawal(phoneNumber, amount, reference) {
    try {
      const accessToken = await this.getAccessToken()
      const timestamp = Date.now().toString()

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\+/g, "")
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "254" + formattedPhone.substring(1)
      }
      if (!formattedPhone.startsWith("254")) {
        formattedPhone = "254" + formattedPhone
      }

      const payload = {
        phoneNumber: formattedPhone,
        amount: Math.round(amount),
        reference: reference,
        callbackUrl: this.callbackUrl,
        timestamp: timestamp,
      }

      const signature = this.generateSignature(JSON.stringify(payload), timestamp)

      const response = await axios.post(
        `${this.baseUrl}/disbursements/initiate`,
        {
          ...payload,
          signature: signature,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      return {
        success: true,
        data: response.data,
        transactionId: response.data.transactionId,
      }
    } catch (error) {
      console.error("KCB withdrawal error:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }
}

module.exports = new KCBService()
