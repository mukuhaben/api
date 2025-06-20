import api from "./api"

class PaymentService {
  async initiatePayment(paymentData) {
    try {
      const response = await api.post("/payments/initiate", paymentData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Payment initiation failed",
      }
    }
  }

  async checkPaymentStatus(paymentId) {
    try {
      const response = await api.get(`/payments/${paymentId}/status`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to check payment status",
      }
    }
  }

  async getPaymentHistory(params = {}) {
    try {
      const response = await api.get("/payments/history", { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch payment history",
      }
    }
  }
}

export default new PaymentService()
