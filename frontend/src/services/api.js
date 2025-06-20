import axios from "axios"

// Create axios instance with better error handling
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://firstcraft-backend-q68n.onrender.com/api",
  timeout: 120000, // Increased timeout for Render cold starts
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error("Request interceptor error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message)
      return Promise.reject(new Error("Network connection failed. Please check your internet connection."))
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn("Rate limit exceeded, waiting before retry...")
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return api(originalRequest)
    }

    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const response = await api.post("/auth/refresh-token")
        const { token } = response.data
        localStorage.setItem("token", token)
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError)
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        // Don't redirect immediately, let the component handle it
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  refreshToken: () => api.post("/auth/refresh-token"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.patch(`/auth/reset-password/${token}`, { password }),
  updatePassword: (passwords) => api.patch("/auth/update-password", passwords),
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (productData) => {
    // Transform camelCase to snake_case for backend compatibility
    const transformedData = {
      productName: productData.productName,
      productCode: productData.productCode,
      description: productData.description,
      longerDescription: productData.longerDescription,
      categoryId: productData.category, // Map category to categoryId
      subcategoryId: productData.subCategory, // Map subCategory to subcategoryId
      costPrice: Number.parseFloat(productData.costPrice) || 0,
      vatRate: Number.parseFloat(productData.vat) || 0,
      stockUnits: Number.parseInt(productData.stockUnits) || 0,
      alertQuantity: Number.parseInt(productData.alertQuantity) || 0,
      unitOfMeasure: productData.uom,
      packSize: productData.packSize,
      productBarcode: productData.productBarcode,
      etimsRefCode: productData.etimsRefCode,
      expiryDate: productData.expiryDate,
      preferredVendor1: productData.preferredVendor1,
      preferredVendor2: productData.preferredVendor2,
      vendorItemCode: productData.vendorItemCode,
      cashbackRate: Number.parseFloat(productData.cashbackRate) || 0,
      saCashback1stPurchase: Number.parseFloat(productData.saCashback1stPurchase) || 6,
      saCashback2ndPurchase: Number.parseFloat(productData.saCashback2ndPurchase) || 4,
      saCashback3rdPurchase: Number.parseFloat(productData.saCashback3rdPurchase) || 3,
      saCashback4thPurchase: Number.parseFloat(productData.saCashback4thPurchase) || 2,
      reorderLevel: Number.parseInt(productData.reorderLevel) || 0,
      orderLevel: Number.parseInt(productData.orderLevel) || 0,
      reorderActive: productData.reorderActive !== false,
      // Create pricing tiers from the form data
      pricingTiers: [
        {
          tierName: "Tier 1",
          minQuantity: Number.parseInt(productData.qty1Min) || 1,
          maxQuantity: Number.parseInt(productData.qty1Max) || 3,
          sellingPrice: Number.parseFloat(productData.sellingPrice1) || 0,
        },
        ...(productData.sellingPrice2
          ? [
              {
                tierName: "Tier 2",
                minQuantity: Number.parseInt(productData.qty2Min) || 4,
                maxQuantity: Number.parseInt(productData.qty2Max) || 11,
                sellingPrice: Number.parseFloat(productData.sellingPrice2),
              },
            ]
          : []),
        ...(productData.sellingPrice3
          ? [
              {
                tierName: "Tier 3",
                minQuantity: Number.parseInt(productData.qty3Min) || 12,
                maxQuantity: null, // No upper limit for tier 3
                sellingPrice: Number.parseFloat(productData.sellingPrice3),
              },
            ]
          : []),
      ].filter((tier) => tier.sellingPrice > 0),
    }

    return api.post("/products", transformedData)
  },
  update: (id, productData) => api.put(`/products/${id}`, productData),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, stockData) => api.patch(`/products/${id}/stock`, stockData),
  getPricing: (id, quantity) => api.get(`/products/${id}/pricing/${quantity}`),
}

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get("/categories", { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (categoryData) => api.post("/categories", categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
}

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get("/orders", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post("/orders", orderData),
  update: (id, orderData) => api.put(`/orders/${id}`, orderData),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  getMyOrders: (params) => api.get("/orders/my-orders", { params }),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (userData) => api.put("/users/profile", userData),
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  registerCustomer: (userData) => api.post("/users/register-customer", userData),
  deactivateUser: (id, reasonData) => api.patch(`/users/${id}/deactivate`, reasonData),
  reactivateUser: (id) => api.patch(`/users/${id}/reactivate`),
}

// Wallet API
export const walletAPI = {
  getBalance: () => api.get("/wallet/balance"),
  getTransactions: (params) => api.get("/wallet/transactions", { params }),
  withdraw: (withdrawalData) => api.post("/wallet/withdraw", withdrawalData),
}

// Payments API
export const paymentsAPI = {
  initiate: (paymentData) => api.post("/payments/initiate", paymentData),
  verify: (transactionId) => api.get(`/payments/verify/${transactionId}`),
  getHistory: (params) => api.get("/payments/history", { params }),
}

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get("/suppliers", { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (supplierData) => api.post("/suppliers", supplierData),
  update: (id, supplierData) => api.put(`/suppliers/${id}`, supplierData),
  delete: (id) => api.delete(`/suppliers/${id}`),
}

// Sales Agents API
export const salesAgentsAPI = {
  getAll: (params) => api.get("/sales-agents", { params }),
  getById: (id) => api.get(`/sales-agents/${id}`),
  getCommissions: (params) => api.get("/sales-agents/commissions", { params }),
  getCustomers: (params) => api.get("/sales-agents/customers", { params }),
}

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get("/admin/dashboard-stats"),
  getUsers: (params) => api.get("/admin/users", { params }),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  getSystemSettings: () => api.get("/admin/settings"),
  updateSystemSettings: (settings) => api.put("/admin/settings", settings),
}

// File Upload API
export const uploadAPI = {
  uploadFile: (file, type = "general") => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)
    return api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },
  uploadMultiple: (files, type = "general") => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files", file)
    })
    formData.append("type", type)
    return api.post("/upload/multiple", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },
}

// Content Management API
export const cmsAPI = {
  // Homepage content
  getHomepageContent: () => api.get("/cms/homepage"),
  updateHomepageContent: (content) => api.put("/cms/homepage", content),

  // Navigation menus
  getNavigationMenus: () => api.get("/cms/navigation"),
  updateNavigationMenus: (menus) => api.put("/cms/navigation", menus),

  // Featured content
  getFeaturedProducts: (params) => api.get("/cms/featured-products", { params }),
  setFeaturedProducts: (productIds) => api.post("/cms/featured-products", { productIds }),

  // Banners and promotions
  getBanners: (location) => api.get(`/cms/banners/${location}`),
  createBanner: (bannerData) => api.post("/cms/banners", bannerData),
  updateBanner: (id, bannerData) => api.put(`/cms/banners/${id}`, bannerData),
  deleteBanner: (id) => api.delete(`/cms/banners/${id}`),

  // Site settings
  getSiteSettings: () => api.get("/cms/settings"),
  updateSiteSettings: (settings) => api.put("/cms/settings", settings),
}

// Enhanced Products API with CMS integration
productsAPI.getFeatured = (params) => api.get("/products/featured", { params })
productsAPI.getByCategory = (categoryId, params) => api.get(`/products/category/${categoryId}`, { params })
productsAPI.search = (query, params) => api.get("/products/search", { params: { q: query, ...params } })
productsAPI.getRecommended = (productId) => api.get(`/products/${productId}/recommended`)

// Media Management API
export const mediaAPI = {
  getImages: (params) => api.get("/media/images", { params }),
  uploadImage: (file, metadata) => {
    const formData = new FormData()
    formData.append("image", file)
    formData.append("metadata", JSON.stringify(metadata))
    return api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
  deleteImage: (id) => api.delete(`/media/images/${id}`),
  optimizeImage: (id, options) => api.post(`/media/images/${id}/optimize`, options),
}

export default api
