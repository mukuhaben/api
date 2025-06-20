"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Alert,
  Tooltip,
  Menu,
  ListItemText,
  Avatar,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
} from "@mui/material"
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Category as CategoryIcon,
  LocalOffer as SubcategoryIcon,
} from "@mui/icons-material"

/**
 * TabPanel Component for supplier details tabs
 */
function TabPanel(props) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`supplier-tabpanel-${index}`}
      aria-labelledby={`supplier-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

/**
 * Enhanced SupplierManagement Component with Categories and Subcategories
 */
const SupplierManagement = () => {
  // State for suppliers data
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    company: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    region: "",
    country: "",
    postalCode: "",
    categories: [], // Array of category IDs
    subcategories: [], // Array of subcategory IDs
    specializations: [], // Array of specialization strings
    paymentTerms: "Net 30",
    taxId: "",
    businessLicense: "",
  })
  const [isAdd, setIsAdd] = useState(false)
  const [alert, setAlert] = useState({ open: false, message: "", severity: "success" })

  // State for supplier details view
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsTabValue, setDetailsTabValue] = useState(0)

  // State for sorting
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" })
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null)

  // State for purchase orders and transactions
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [viewPODialogOpen, setViewPODialogOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [viewTransactionDialogOpen, setViewTransactionDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  /**
   * Initialize sample data with enhanced supplier categories
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sample categories data
        const mockCategories = [
          {
            id: 1,
            name: "Office Supplies",
            subcategories: [
              { id: 101, name: "Stationery", parent_id: 1 },
              { id: 102, name: "Paper Products", parent_id: 1 },
              { id: 103, name: "Writing Instruments", parent_id: 1 },
              { id: 104, name: "Filing & Storage", parent_id: 1 },
            ],
          },
          {
            id: 2,
            name: "Technology",
            subcategories: [
              { id: 201, name: "Computers & Laptops", parent_id: 2 },
              { id: 202, name: "Printers & Scanners", parent_id: 2 },
              { id: 203, name: "Networking Equipment", parent_id: 2 },
              { id: 204, name: "Software", parent_id: 2 },
            ],
          },
          {
            id: 3,
            name: "Furniture",
            subcategories: [
              { id: 301, name: "Office Chairs", parent_id: 3 },
              { id: 302, name: "Desks & Tables", parent_id: 3 },
              { id: 303, name: "Storage Furniture", parent_id: 3 },
              { id: 304, name: "Reception Furniture", parent_id: 3 },
            ],
          },
          {
            id: 4,
            name: "Cleaning Supplies",
            subcategories: [
              { id: 401, name: "Cleaning Chemicals", parent_id: 4 },
              { id: 402, name: "Cleaning Equipment", parent_id: 4 },
              { id: 403, name: "Paper Towels & Tissues", parent_id: 4 },
              { id: 404, name: "Janitorial Supplies", parent_id: 4 },
            ],
          },
        ]
        setCategories(mockCategories)

        // Enhanced suppliers data with categories and specializations
        const mockSuppliers = [
          {
            id: 1,
            name: "Grier Marousek",
            company: "Grier Enterprises",
            contact: "Grier Marousek",
            email: "gmarousek1d@google.ru",
            phone: "414-149-2995",
            address: "17 Northport Hill",
            city: "Milwaukee",
            region: "Wisconsin",
            country: "United States",
            postalCode: "53225",
            createdAt: "2023-05-15T10:30:00Z",
            balance: 0,
            income: 0,
            expenses: 0,
            categories: [1, 4], // Office Supplies, Cleaning Supplies
            subcategories: [101, 102, 401, 402], // Stationery, Paper Products, Cleaning Chemicals, Equipment
            specializations: ["Bulk Office Supplies", "Eco-friendly Products", "Same-day Delivery"],
            paymentTerms: "Net 30",
            taxId: "US-TAX-001",
            businessLicense: "WI-BL-12345",
            rating: 4.5,
            totalOrders: 45,
          },
          {
            id: 2,
            name: "Afri Supplies Ltd",
            company: "Afri Supplies Ltd",
            contact: "John Kamau",
            email: "info@afrisupplies.co.ke",
            phone: "+254 722 123 456",
            address: "Industrial Area, Nairobi",
            city: "Nairobi",
            region: "Nairobi",
            country: "Kenya",
            postalCode: "00100",
            createdAt: "2023-06-20T14:45:00Z",
            balance: 15000,
            income: 45000,
            expenses: 30000,
            categories: [1, 2], // Office Supplies, Technology
            subcategories: [101, 103, 201, 202], // Stationery, Writing Instruments, Computers, Printers
            specializations: ["Local Manufacturing", "Custom Branding", "Bulk Discounts", "Technical Support"],
            paymentTerms: "Payment On Receipt",
            taxId: "KE-PIN-A001",
            businessLicense: "KE-BL-67890",
            rating: 4.8,
            totalOrders: 78,
          },
          {
            id: 3,
            name: "KB Stationery Ltd",
            company: "KB Stationery Ltd",
            contact: "Mary Wanjiku",
            email: "sales@kbstationery.co.ke",
            phone: "+254 733 987 654",
            address: "Mombasa Road, Nairobi",
            city: "Nairobi",
            region: "Nairobi",
            country: "Kenya",
            postalCode: "00200",
            createdAt: "2023-07-05T09:15:00Z",
            balance: 8500,
            income: 32000,
            expenses: 23500,
            categories: [1], // Office Supplies only
            subcategories: [101, 102, 103, 104], // All office supply subcategories
            specializations: ["Premium Stationery", "Corporate Gifts", "Custom Printing", "School Supplies"],
            paymentTerms: "Net 15",
            taxId: "KE-PIN-B002",
            businessLicense: "KE-BL-11111",
            rating: 4.3,
            totalOrders: 32,
          },
          {
            id: 4,
            name: "Office Solutions Kenya",
            company: "Office Solutions Kenya Ltd",
            contact: "Peter Mwangi",
            email: "peter@officesolutions.co.ke",
            phone: "+254 711 555 123",
            address: "Westlands, Nairobi",
            city: "Nairobi",
            region: "Nairobi",
            country: "Kenya",
            postalCode: "00600",
            createdAt: "2023-08-10T11:20:00Z",
            balance: 12000,
            income: 28000,
            expenses: 16000,
            categories: [2, 3], // Technology, Furniture
            subcategories: [201, 202, 203, 301, 302], // Tech and furniture subcategories
            specializations: ["Complete Office Setup", "IT Consulting", "Furniture Installation", "Warranty Support"],
            paymentTerms: "Net 45",
            taxId: "KE-PIN-C003",
            businessLicense: "KE-BL-22222",
            rating: 4.6,
            totalOrders: 56,
          },
        ]
        setSuppliers(mockSuppliers)

        // Sample purchase orders (existing data)
        const mockPurchaseOrders = [
          {
            id: "PO001",
            poNumber: "PO001",
            supplierId: 1,
            supplierName: "Grier Marousek",
            orderDate: "2024-06-01",
            dueDate: "2024-06-15",
            status: "pending",
            totalAmount: 1537.0,
            reference: "1001",
            warehouse: "Main Warehouse",
            tax: "16%",
            discount: "5%",
            items: [
              {
                productCode: "L0202004",
                productName: "Afri Multipurpose Labels K11 19*13mm White",
                quantity: 10,
                rate: 50.0,
                taxRate: 16,
                discount: 0,
                amount: 580.0,
                categoryId: 1,
                subcategoryId: 101,
              },
              {
                productCode: "P0601005",
                productName: "Afri Packing Tape (Brown) 48mm*100Mtr",
                quantity: 5,
                rate: 165.0,
                taxRate: 16,
                discount: 0,
                amount: 957.0,
                categoryId: 1,
                subcategoryId: 102,
              },
            ],
            paymentTerms: "Payment On Receipt",
            updateStock: true,
            notes: "Urgent delivery required for client project",
          },
          // ... other POs remain the same
        ]
        setPurchaseOrders(mockPurchaseOrders)

        // Sample transactions (existing data)
        const mockTransactions = [
          {
            id: 1,
            supplierId: 1,
            supplierName: "Grier Marousek",
            type: "Purchase",
            amount: 1537.0,
            date: "2024-06-01",
            reference: "PO001",
            status: "Completed",
            description: "Office supplies purchase",
            paymentMethod: "Bank Transfer",
          },
          // ... other transactions remain the same
        ]
        setTransactions(mockTransactions)
      } catch (error) {
        console.error("Error fetching data:", error)
        setAlert({ open: true, message: "Error loading data", severity: "error" })
      }
    }

    fetchData()
  }, [])

  /**
   * Get category name by ID
   */
  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Unknown Category"
  }

  /**
   * Get subcategory name by ID
   */
  const getSubcategoryName = (subcategoryId) => {
    for (const category of categories) {
      const subcategory = category.subcategories.find((sub) => sub.id === subcategoryId)
      if (subcategory) return subcategory.name
    }
    return "Unknown Subcategory"
  }

  /**
   * Get all subcategories for selected categories
   */
  const getAvailableSubcategories = (selectedCategoryIds) => {
    const subcategories = []
    selectedCategoryIds.forEach((categoryId) => {
      const category = categories.find((cat) => cat.id === categoryId)
      if (category) {
        subcategories.push(...category.subcategories)
      }
    })
    return subcategories
  }

  /**
   * Filter suppliers based on search term
   */
  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchTermLower = searchTerm.toLowerCase()
    const categoryNames = supplier.categories
      .map((catId) => getCategoryName(catId))
      .join(" ")
      .toLowerCase()
    const subcategoryNames = supplier.subcategories
      .map((subId) => getSubcategoryName(subId))
      .join(" ")
      .toLowerCase()
    const specializations = supplier.specializations.join(" ").toLowerCase()

    return (
      supplier.name.toLowerCase().includes(searchTermLower) ||
      supplier.company.toLowerCase().includes(searchTermLower) ||
      supplier.email.toLowerCase().includes(searchTermLower) ||
      supplier.phone.includes(searchTerm) ||
      categoryNames.includes(searchTermLower) ||
      subcategoryNames.includes(searchTermLower) ||
      specializations.includes(searchTermLower)
    )
  })

  /**
   * Sort suppliers
   */
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    if (sortConfig.key === "name") {
      return sortConfig.direction === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    }
    if (sortConfig.key === "company") {
      return sortConfig.direction === "asc" ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company)
    }
    if (sortConfig.key === "totalOrders") {
      return sortConfig.direction === "asc" ? a.totalOrders - b.totalOrders : b.totalOrders - a.totalOrders
    }
    if (sortConfig.key === "rating") {
      return sortConfig.direction === "asc" ? a.rating - b.rating : b.rating - a.rating
    }
    return 0
  })

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setSupplierFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  /**
   * Handle category selection change
   */
  const handleCategoryChange = (selectedCategories) => {
    setSupplierFormData((prev) => ({
      ...prev,
      categories: selectedCategories,
      subcategories: [], // Reset subcategories when categories change
    }))
  }

  /**
   * Handle subcategory selection change
   */
  const handleSubcategoryChange = (selectedSubcategories) => {
    setSupplierFormData((prev) => ({
      ...prev,
      subcategories: selectedSubcategories,
    }))
  }

  /**
   * Handle specialization changes
   */
  const handleSpecializationChange = (specializations) => {
    setSupplierFormData((prev) => ({
      ...prev,
      specializations,
    }))
  }

  /**
   * Open add supplier dialog
   */
  const handleAddSupplier = () => {
    setSupplierFormData({
      name: "",
      company: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      region: "",
      country: "",
      postalCode: "",
      categories: [],
      subcategories: [],
      specializations: [],
      paymentTerms: "Net 30",
      taxId: "",
      businessLicense: "",
    })
    setSelectedSupplier(null)
    setIsAdd(true)
    setOpenDialog(true)
  }

  /**
   * Open edit supplier dialog
   */
  const handleEditSupplier = (supplier) => {
    setSupplierFormData({
      name: supplier.name,
      company: supplier.company,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      region: supplier.region,
      country: supplier.country,
      postalCode: supplier.postalCode,
      categories: supplier.categories || [],
      subcategories: supplier.subcategories || [],
      specializations: supplier.specializations || [],
      paymentTerms: supplier.paymentTerms || "Net 30",
      taxId: supplier.taxId || "",
      businessLicense: supplier.businessLicense || "",
    })
    setSelectedSupplier(supplier)
    setIsAdd(false)
    setOpenDialog(true)
  }

  /**
   * Handle supplier form submission
   */
  const handleSubmitSupplier = () => {
    try {
      if (isAdd) {
        const newSupplier = {
          id: suppliers.length + 1,
          ...supplierFormData,
          createdAt: new Date().toISOString(),
          balance: 0,
          income: 0,
          expenses: 0,
          rating: 0,
          totalOrders: 0,
        }
        setSuppliers((prev) => [...prev, newSupplier])
        setAlert({ open: true, message: "Supplier added successfully!", severity: "success" })
      } else {
        setSuppliers((prev) =>
          prev.map((supplier) =>
            supplier.id === selectedSupplier.id ? { ...supplier, ...supplierFormData } : supplier,
          ),
        )
        setAlert({ open: true, message: "Supplier updated successfully!", severity: "success" })
      }
      setOpenDialog(false)
    } catch (error) {
      console.error("Error saving supplier:", error)
      setAlert({ open: true, message: "Error saving supplier", severity: "error" })
    }
  }

  /**
   * Handle supplier deletion
   */
  const handleDeleteSupplier = (supplierId) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== supplierId))
      setAlert({ open: true, message: "Supplier deleted successfully!", severity: "success" })
    }
  }

  /**
   * View supplier details
   */
  const handleViewSupplierDetails = (supplier) => {
    setSelectedSupplier(supplier)
    setDetailsOpen(true)
    setDetailsTabValue(0)
  }

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  /**
   * Get supplier purchase orders
   */
  const getSupplierPurchaseOrders = (supplierId) => {
    return purchaseOrders.filter((po) => po.supplierId === supplierId)
  }

  /**
   * Get supplier transactions
   */
  const getSupplierTransactions = (supplierId) => {
    return transactions.filter((transaction) => transaction.supplierId === supplierId)
  }

  return (
    <Box sx={{ width: "100%", bgcolor: "#f8fafc", minHeight: "100vh", p: 3 }}>
      {/* Header */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ p: 3, bgcolor: "#1976d2", color: "white" }}>
          <Typography variant="h5" sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
            Supplier Management
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            Manage suppliers with their categories, specializations, and order batching capabilities.
          </Typography>
        </Box>
      </Paper>

      {/* Controls */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: "'Poppins', sans-serif" }}>
            Suppliers ({sortedSuppliers.length})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddSupplier} sx={{ borderRadius: 2 }}>
            Add Supplier
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search suppliers by name, company, email, categories, or specializations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 120 }}
          >
            Sort
          </Button>
        </Box>

        {/* Category Filter Chips */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {categories.map((category) => {
            const supplierCount = sortedSuppliers.filter((s) => s.categories.includes(category.id)).length
            return (
              <Chip
                key={category.id}
                label={`${category.name} (${supplierCount})`}
                variant="outlined"
                size="small"
                icon={<CategoryIcon />}
              />
            )
          })}
        </Box>

        {alert.open && (
          <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, open: false })} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}
      </Paper>

      {/* Suppliers Table */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Categories & Specializations</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Performance</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Payment Terms</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSuppliers.map((supplier) => (
                <TableRow key={supplier.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar sx={{ bgcolor: "#1976d2" }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {supplier.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {supplier.company}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {supplier.city}, {supplier.country}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{supplier.email}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{supplier.phone}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {/* Categories */}
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {supplier.categories.map((categoryId) => (
                          <Chip
                            key={categoryId}
                            label={getCategoryName(categoryId)}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<CategoryIcon />}
                          />
                        ))}
                      </Box>
                      {/* Subcategories */}
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {supplier.subcategories.slice(0, 3).map((subcategoryId) => (
                          <Chip
                            key={subcategoryId}
                            label={getSubcategoryName(subcategoryId)}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            icon={<SubcategoryIcon />}
                          />
                        ))}
                        {supplier.subcategories.length > 3 && (
                          <Chip label={`+${supplier.subcategories.length - 3} more`} size="small" variant="outlined" />
                        )}
                      </Box>
                      {/* Top Specializations */}
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {supplier.specializations.slice(0, 2).map((spec, index) => (
                          <Chip
                            key={index}
                            label={spec}
                            size="small"
                            color="success"
                            variant="filled"
                            sx={{ fontSize: "0.7rem" }}
                          />
                        ))}
                        {supplier.specializations.length > 2 && (
                          <Tooltip title={supplier.specializations.slice(2).join(", ")}>
                            <Chip label={`+${supplier.specializations.length - 2}`} size="small" variant="outlined" />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Rating: {supplier.rating}/5
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Orders: {supplier.totalOrders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Balance: {formatCurrency(supplier.balance)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={supplier.paymentTerms}
                      size="small"
                      color={supplier.paymentTerms === "Payment On Receipt" ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewSupplierDetails(supplier)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Supplier">
                        <IconButton size="small" onClick={() => handleEditSupplier(supplier)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Supplier">
                        <IconButton size="small" onClick={() => handleDeleteSupplier(supplier.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {sortedSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary">No suppliers found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Sort Menu */}
      <Menu anchorEl={sortMenuAnchor} open={Boolean(sortMenuAnchor)} onClose={() => setSortMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setSortConfig({ key: "name", direction: "asc" })
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText>Name (A-Z)</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSortConfig({ key: "name", direction: "desc" })
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText>Name (Z-A)</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSortConfig({ key: "totalOrders", direction: "desc" })
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText>Most Orders</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSortConfig({ key: "rating", direction: "desc" })
            setSortMenuAnchor(null)
          }}
        >
          <ListItemText>Highest Rating</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{isAdd ? "Add New Supplier" : "Edit Supplier"}</Typography>
            <IconButton onClick={() => setOpenDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
                Basic Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Supplier Name"
                value={supplierFormData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={supplierFormData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={supplierFormData.contact}
                onChange={(e) => handleInputChange("contact", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={supplierFormData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Terms</InputLabel>
                <Select
                  value={supplierFormData.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                  label="Payment Terms"
                >
                  <MenuItem value="Payment On Receipt">Payment On Receipt</MenuItem>
                  <MenuItem value="Net 15">Net 15</MenuItem>
                  <MenuItem value="Net 30">Net 30</MenuItem>
                  <MenuItem value="Net 45">Net 45</MenuItem>
                  <MenuItem value="Net 60">Net 60</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
                Address Information
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={supplierFormData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={supplierFormData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Region/State"
                value={supplierFormData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Country"
                value={supplierFormData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Postal Code"
                value={supplierFormData.postalCode}
                onChange={(e) => handleInputChange("postalCode", e.target.value)}
              />
            </Grid>

            {/* Categories and Specializations */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
                Categories & Specializations
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={categories}
                getOptionLabel={(option) => option.name}
                value={categories.filter((cat) => supplierFormData.categories.includes(cat.id))}
                onChange={(event, newValue) => {
                  handleCategoryChange(newValue.map((cat) => cat.id))
                }}
                renderInput={(params) => <TextField {...params} label="Categories" placeholder="Select categories" />}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                      icon={<CategoryIcon />}
                    />
                  ))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={getAvailableSubcategories(supplierFormData.categories)}
                getOptionLabel={(option) => option.name}
                value={getAvailableSubcategories(supplierFormData.categories).filter((sub) =>
                  supplierFormData.subcategories.includes(sub.id),
                )}
                onChange={(event, newValue) => {
                  handleSubcategoryChange(newValue.map((sub) => sub.id))
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Subcategories" placeholder="Select subcategories" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option.name}
                      {...getTagProps({ index })}
                      key={option.id}
                      icon={<SubcategoryIcon />}
                    />
                  ))
                }
                disabled={supplierFormData.categories.length === 0}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[
                  "Bulk Orders",
                  "Custom Branding",
                  "Same-day Delivery",
                  "Technical Support",
                  "Installation Services",
                  "Warranty Support",
                  "Eco-friendly Products",
                  "Local Manufacturing",
                  "Import Services",
                  "Quality Assurance",
                ]}
                value={supplierFormData.specializations}
                onChange={(event, newValue) => {
                  handleSpecializationChange(newValue)
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Specializations"
                    placeholder="Add specializations (type and press Enter)"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="filled" label={option} {...getTagProps({ index })} key={index} color="success" />
                  ))
                }
              />
            </Grid>

            {/* Business Information */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
                Business Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tax ID / PIN"
                value={supplierFormData.taxId}
                onChange={(e) => handleInputChange("taxId", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Business License"
                value={supplierFormData.businessLicense}
                onChange={(e) => handleInputChange("businessLicense", e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitSupplier}
            disabled={!supplierFormData.name || !supplierFormData.email || !supplierFormData.phone}
          >
            {isAdd ? "Add Supplier" : "Update Supplier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Supplier Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">{selectedSupplier?.name} - Supplier Details</Typography>
            <IconButton onClick={() => setDetailsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box>
              {/* Supplier Summary Card */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3} sx={{ textAlign: "center" }}>
                    <Avatar sx={{ width: 80, height: 80, mx: "auto", mb: 1, bgcolor: "#1976d2" }}>
                      <BusinessIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h6">{selectedSupplier.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedSupplier.company}
                    </Typography>
                    <Chip label={`Rating: ${selectedSupplier.rating}/5`} color="primary" size="small" sx={{ mt: 1 }} />
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Contact Person
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedSupplier.contact}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedSupplier.email}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedSupplier.phone}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Payment Terms
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedSupplier.paymentTerms}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Orders
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {selectedSupplier.totalOrders}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Current Balance
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {formatCurrency(selectedSupplier.balance)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Paper>

              {/* Tabs for detailed information */}
              <Tabs
                value={detailsTabValue}
                onChange={(event, newValue) => setDetailsTabValue(newValue)}
                aria-label="supplier details tabs"
              >
                <Tab label="Overview" icon={<BusinessIcon />} iconPosition="start" />
                <Tab label="Categories" icon={<CategoryIcon />} iconPosition="start" />
                <Tab label="Purchase Orders" icon={<ReceiptIcon />} iconPosition="start" />
                <Tab label="Transactions" icon={<PaymentIcon />} iconPosition="start" />
              </Tabs>

              <TabPanel value={detailsTabValue} index={0}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Supplier Overview
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Contact Information
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Address:</strong> {selectedSupplier.address}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>City:</strong> {selectedSupplier.city}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Region:</strong> {selectedSupplier.region}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Country:</strong> {selectedSupplier.country}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Postal Code:</strong> {selectedSupplier.postalCode}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Business Information
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Tax ID:</strong> {selectedSupplier.taxId || "N/A"}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Business License:</strong> {selectedSupplier.businessLicense || "N/A"}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Member Since:</strong> {new Date(selectedSupplier.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Payment Terms:</strong> {selectedSupplier.paymentTerms}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={detailsTabValue} index={1}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Categories & Specializations
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Categories
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {selectedSupplier.categories.map((categoryId) => (
                            <Chip
                              key={categoryId}
                              label={getCategoryName(categoryId)}
                              color="primary"
                              variant="outlined"
                              icon={<CategoryIcon />}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Subcategories
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {selectedSupplier.subcategories.map((subcategoryId) => (
                            <Chip
                              key={subcategoryId}
                              label={getSubcategoryName(subcategoryId)}
                              color="secondary"
                              variant="outlined"
                              icon={<SubcategoryIcon />}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Specializations
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {selectedSupplier.specializations.map((spec, index) => (
                            <Chip key={index} label={spec} color="success" variant="filled" />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={detailsTabValue} index={2}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Purchase Orders
                </Typography>
                {getSupplierPurchaseOrders(selectedSupplier.id).length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>PO Number</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Items</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getSupplierPurchaseOrders(selectedSupplier.id).map((po) => (
                          <TableRow key={po.id}>
                            <TableCell>{po.poNumber}</TableCell>
                            <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(po.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                            <TableCell>
                              <Chip label={po.status} size="small" />
                            </TableCell>
                            <TableCell>{po.items.length} items</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography>No purchase orders found for this supplier.</Typography>
                )}
              </TabPanel>

              <TabPanel value={detailsTabValue} index={3}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Transaction History
                </Typography>
                {getSupplierTransactions(selectedSupplier.id).length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Payment Method</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getSupplierTransactions(selectedSupplier.id).map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell>{transaction.type}</TableCell>
                            <TableCell>{transaction.reference}</TableCell>
                            <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                            <TableCell>
                              <Chip label={transaction.status} size="small" />
                            </TableCell>
                            <TableCell>{transaction.paymentMethod}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography>No transactions found for this supplier.</Typography>
                )}
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SupplierManagement
