import api from "./api"

class OrderService {
  async createOrder(orderData) {
    try {
      const response = await api.post("/orders", orderData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create order",
      }
    }
  }

  async getOrders(params = {}) {
    try {
      const response = await api.get("/orders", { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch orders",
      }
    }
  }

  async getOrder(id) {
    try {
      const response = await api.get(`/orders/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch order",
      }
    }
  }

  async updateOrderStatus(id, status) {
    try {
      const response = await api.patch(`/orders/${id}/status`, { status })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update order status",
      }
    }
  }

  async cancelOrder(id) {
    try {
      const response = await api.patch(`/orders/${id}/cancel`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to cancel order",
      }
    }
  }
}

export default new OrderService()
