import api from "./api"

class AuthService {
  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials)
      const { token, refreshToken, user } = response.data

      localStorage.setItem("token", token)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))

      return { success: true, user, token }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      }
    }
  }

  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      }
    }
  }

  async logout() {
    try {
      await api.post("/auth/logout")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("user")
    }
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem("refreshToken")
      const response = await api.post("/auth/refresh", { refreshToken })
      const { token } = response.data

      localStorage.setItem("token", token)
      return token
    } catch (error) {
      this.logout()
      throw error
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  }

  isAuthenticated() {
    return !!localStorage.getItem("token")
  }

  hasRole(role) {
    const user = this.getCurrentUser()
    return user?.user_type === role
  }
}

export default new AuthService()
