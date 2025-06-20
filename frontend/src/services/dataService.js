import { cmsAPI, productsAPI, categoriesAPI } from "./api"

class DataService {
  constructor() {
    this.cache = new Map()
    this.cacheDuration = 5 * 60 * 1000 // 5 minutes
  }

  async getCachedData(key, fetcher, options = {}) {
    const { forceRefresh = false, cacheDuration = this.cacheDuration } = options

    const cached = this.cache.get(key)
    if (cached && !forceRefresh && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data
    }

    try {
      const data = await fetcher()
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      })
      return data
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        console.warn("Using expired cache due to fetch error:", error)
        return cached.data
      }
      throw error
    }
  }

  async getProducts(params = {}) {
    const key = `products_${JSON.stringify(params)}`
    return this.getCachedData(key, () => productsAPI.getAll(params))
  }

  async getCategories() {
    return this.getCachedData("categories", () => categoriesAPI.getAll())
  }

  async getHomepageContent() {
    return this.getCachedData("homepage", () => cmsAPI.getHomepageContent())
  }

  async getNavigationMenus() {
    return this.getCachedData("navigation", () => cmsAPI.getNavigationMenus())
  }

  async getFeaturedProducts(section) {
    const key = `featured_${section}`
    return this.getCachedData(key, () => cmsAPI.getFeaturedProducts({ section }))
  }

  clearCache(key) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  // Preload critical data
  async preloadCriticalData() {
    try {
      await Promise.all([this.getCategories(), this.getNavigationMenus(), this.getFeaturedProducts("homepage")])
    } catch (error) {
      console.warn("Failed to preload some critical data:", error)
    }
  }
}

export const dataService = new DataService()
export default dataService
