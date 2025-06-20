"use client"

import { useState, useEffect, useCallback } from "react"
import { productsAPI, categoriesAPI, cmsAPI } from "../services/api"

// Custom hook for data fetching with error handling
export const useApiData = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiCall()
      setData(response.data)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data")
      console.error("API Error:", err)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Hook for products with caching
export const useProducts = (params = {}) => {
  return useApiData(() => productsAPI.getAll(params), [JSON.stringify(params)])
}

// Hook for categories
export const useCategories = () => {
  return useApiData(() => categoriesAPI.getAll())
}

// Hook for featured products
export const useFeaturedProducts = (section) => {
  return useApiData(() => cmsAPI.getFeaturedProducts({ section }), [section])
}

// Hook for CMS content
export const useCMSContent = (contentType) => {
  return useApiData(() => cmsAPI.getHomepageContent(), [contentType])
}

// Hook for navigation menus
export const useNavigationMenus = () => {
  return useApiData(() => cmsAPI.getNavigationMenus())
}
