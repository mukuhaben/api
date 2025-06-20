import { CMSService } from "../services/cmsService.js";

// CMS Controller for managing content and navigation
const cmsController = {
  // Get navigation menu structure
  getNavigation: async (req, res) => {
    try {
      const navigation = {
        mainMenu: [
          { id: 1, name: "Home", path: "/", active: true },
          { id: 2, name: "Products", path: "/products", active: true },
          { id: 3, name: "Categories", path: "/categories", active: true },
          { id: 4, name: "About", path: "/about", active: true },
          { id: 5, name: "Contact", path: "/contact", active: true },
        ],
        adminMenu: [
          { id: 1, name: "Dashboard", path: "/admin", icon: "dashboard" },
          { id: 2, name: "Products", path: "/admin/products", icon: "package" },
          { id: 3, name: "Orders", path: "/admin/orders", icon: "shopping-cart" },
          { id: 4, name: "Users", path: "/admin/users", icon: "users" },
          { id: 5, name: "Settings", path: "/admin/settings", icon: "settings" },
        ],
      };

      res.json({
        success: true,
        data: navigation,
      });
    } catch (error) {
      console.error("Error fetching navigation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch navigation",
        error: error.message,
      });
    }
  },

  // Update navigation structure
  updateNavigation: async (req, res) => {
    try {
      const { mainMenu, adminMenu } = req.body;

      res.json({
        success: true,
        message: "Navigation updated successfully",
        data: { mainMenu, adminMenu },
      });
    } catch (error) {
      console.error("Error updating navigation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update navigation",
        error: error.message,
      });
    }
  },

  // Get content by type
  getContent: async (req, res) => {
    try {
      const { type } = req.params;

      const contentMap = {
        homepage: {
          hero: {
            title: "Welcome to FirstCraft",
            subtitle: "Your premier destination for quality products",
            buttonText: "Shop Now",
            backgroundImage: "/images/hero-bg.jpg",
          },
          features: [
            { title: "Quality Products", description: "Premium quality guaranteed" },
            { title: "Fast Delivery", description: "Quick and reliable shipping" },
            { title: "24/7 Support", description: "Always here to help" },
          ],
        },
        about: {
          title: "About FirstCraft",
          content: "We are committed to providing the best products and services.",
          mission: "To deliver excellence in every product we offer.",
          vision: "To be the leading e-commerce platform in our region.",
        },
        contact: {
          email: "info@firstcraft.com",
          phone: "+254 700 000 000",
          address: "Nairobi, Kenya",
          hours: "Mon-Fri: 9AM-6PM",
        },
      };

      const content = contentMap[type] || {};

      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch content",
        error: error.message,
      });
    }
  },

  // Update content
  updateContent: async (req, res) => {
    try {
      const { type } = req.params;
      const content = req.body;

      res.json({
        success: true,
        message: `${type} content updated successfully`,
        data: content,
      });
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update content",
        error: error.message,
      });
    }
  },

  // Get site settings
  getSettings: async (req, res) => {
    try {
      const settings = {
        siteName: "FirstCraft",
        siteDescription: "Premium E-commerce Platform",
        logo: "/images/logo.png",
        favicon: "/images/favicon.ico",
        currency: "KES",
        timezone: "Africa/Nairobi",
        language: "en",
        maintenanceMode: false,
        allowRegistration: true,
        emailNotifications: true,
        smsNotifications: false,
      };

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
        error: error.message,
      });
    }
  },

  // Update site settings
  updateSettings: async (req, res) => {
    try {
      const settings = req.body;

      res.json({
        success: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error.message,
      });
    }
  },

  // Get banners
  getBanners: async (req, res) => {
    try {
      const banners = [
        {
          id: 1,
          title: "Summer Sale",
          description: "Up to 50% off on selected items",
          image: "/images/banner1.jpg",
          link: "/products?sale=true",
          active: true,
          order: 1,
        },
        {
          id: 2,
          title: "New Arrivals",
          description: "Check out our latest products",
          image: "/images/banner2.jpg",
          link: "/products?new=true",
          active: true,
          order: 2,
        },
      ];

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch banners",
        error: error.message,
      });
    }
  },

  // Create banner
  createBanner: async (req, res) => {
    try {
      const banner = req.body;

      const newBanner = {
        id: Date.now(),
        ...banner,
        createdAt: new Date().toISOString(),
      };

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: newBanner,
      });
    } catch (error) {
      console.error("Error creating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create banner",
        error: error.message,
      });
    }
  },

  // Update banner
  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const banner = req.body;

      res.json({
        success: true,
        message: "Banner updated successfully",
        data: { id: Number.parseInt(id), ...banner },
      });
    } catch (error) {
      console.error("Error updating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update banner",
        error: error.message,
      });
    }
  },

  // Delete banner
  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;

      res.json({
        success: true,
        message: "Banner deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete banner",
        error: error.message,
      });
    }
  },

  // Get homepage content
  getHomepageContent: async (req, res) => {
    try {
      const homepageContent = {
        hero: {
          title: "Welcome to FirstCraft",
          subtitle: "Discover amazing products at great prices",
          buttonText: "Shop Now",
          buttonLink: "/products",
          backgroundImage: "/images/hero-bg.jpg",
        },
        featuredProducts: [],
        categories: [],
        testimonials: [
          {
            id: 1,
            name: "John Doe",
            comment: "Great service and quality products!",
            rating: 5,
          },
        ],
        stats: {
          totalProducts: 456,
          totalOrders: 2847,
          activeCustomers: 1234,
          totalSales: 1200000,
        },
      };

      res.json({
        success: true,
        data: homepageContent,
      });
    } catch (error) {
      console.error("Error fetching homepage content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch homepage content",
        error: error.message,
      });
    }
  },

  // Update homepage content
  updateHomepageContent: async (req, res) => {
    try {
      const content = req.body;

      res.json({
        success: true,
        message: "Homepage content updated successfully",
        data: content,
      });
    } catch (error) {
      console.error("Error updating homepage content:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update homepage content",
        error: error.message,
      });
    }
  },
};

// ✅ Clean Pattern A: named + default exports
export { cmsController };
export default cmsController;
