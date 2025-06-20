import api from "./api"

class ProductService {
  async getProducts(params = {}) {
    try {
      const response = await api.get("/products", { params })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch products",
      }
    }
  }

  async getProduct(id) {
    try {
      const response = await api.get(`/products/${id}`)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch product",
      }
    }
  }

  async createProduct(productData) {
    try {
      const response = await api.post("/products", productData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create product",
      }
    }
  }

  async updateProduct(id, productData) {
    try {
      const response = await api.put(`/products/${id}`, productData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update product",
      }
    }
  }

  async deleteProduct(id) {
    try {
      await api.delete(`/products/${id}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete product",
      }
    }
  }

  async getCategories() {
    try {
      const response = await api.get("/categories")
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to fetch categories",
      }
    }
  }
}

export default new ProductService()
