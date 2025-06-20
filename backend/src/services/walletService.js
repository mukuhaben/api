import api from "./api"

class WalletService {
  async getWalletBalance() {
    try {
      const response = await api.get("/wallet/balance")
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch wallet balance",
      }
    }
  }

  async getTransactionHistory(params = {}) {
    try {
      const response = await api.get("/wallet/transactions", { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch transaction history",
      }
    }
  }

  async initiateWithdrawal(withdrawalData) {
    try {
      const response = await api.post("/wallet/withdraw", withdrawalData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Withdrawal failed",
      }
    }
  }

  async getWithdrawalHistory(params = {}) {
    try {
      const response = await api.get("/wallet/withdrawals", { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch withdrawal history",
      }
    }
  }
}

export default new WalletService()
