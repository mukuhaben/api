"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  InputAdornment,
  FormHelperText,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Chip,
} from "@mui/material"
import { Upload, Image as ImageIcon, ExpandMore, QrCode } from "@mui/icons-material"
import productService from "../../services/productService.jsx"

// Initial form state with all required fields
const initialFormState = {
  // Basic Information
  productName: "",
  productCode: "", // Alphanumeric format A0101001
  uom: "PC", // Unit of Measure
  packSize: "",
  category: "",
  subCategory: "",
  description: "",
  longerDescription: "",
  productBarcode: "",
  etimsRefCode: "",
  expiryDate: "",
  image: null,
  imagePreview: null,

  // Pricing Information
  costPrice: "", // Excluding VAT
  sellingPrice1: "", // Including VAT
  sellingPrice2: "", // Including VAT
  sellingPrice3: "", // Including VAT
  qty1: "",
  qty2: "",
  qty3: "",
  vat: "16", // Default VAT rate

  // Vendor Information
  preferredVendor1: "",
  preferredVendor2: "",
  vendorItemCode: "",

  // Customer Incentives
  cashbackRate: "0", // Cashback % to client

  // Sales Agent Incentives
  saCashback1stPurchase: "6", // 6% on 1st purchase
  saCashback2ndPurchase: "4", // 4% on 2nd purchase
  saCashback3rdPurchase: "3", // 3% on 3rd purchase
  saCashback4thPurchase: "2", // 2% on 4th purchase

  // Inventory Management
  stockUnits: "",
  reorderLevel: "",
  orderLevel: "",
  reorderActive: true,
  alertQuantity: "",

  // Quantity ranges
  qty1Min: "1",
  qty1Max: "3",
  qty2Min: "4",
  qty2Max: "11",
  qty3Min: "12",
}

const uomOptions = ["PC", "PKT", "BOX", "SET", "KG", "LITERS", "METERS", "REAMS", "PACKS"]
const vatRates = ["0", "8", "16"] // Common VAT rates

export default function NewItemForm({ categories = [], vendors = [], onSubmit, editItem = null }) {
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})
  const [subCategories, setSubCategories] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [calculatedProfits, setCalculatedProfits] = useState({
    gp1: 0,
    np1: 0,
    gp2: 0,
    np2: 0,
    gp3: 0,
    np3: 0,
  })
  const [calculatedCashback, setCalculatedCashback] = useState({
    cashback1: 0,
    cashback2: 0,
    cashback3: 0,
  })

  // Initialize form with edit data if provided
  useEffect(() => {
    if (editItem) {
      setIsEditMode(true)
      setFormData({
        ...editItem,
        imagePreview: editItem.image || null,
      })
    }
  }, [editItem])

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category && categories.length > 0) {
      const selectedCategory = categories.find((cat) => cat.name === formData.category)
      if (selectedCategory && selectedCategory.subCategories) {
        setSubCategories(selectedCategory.subCategories)
        if (!selectedCategory.subCategories.some((sub) => sub.name === formData.subCategory)) {
          setFormData((prev) => ({ ...prev, subCategory: "" }))
        }
      } else {
        setSubCategories([])
      }
    } else {
      setSubCategories([])
    }
  }, [formData.category, categories])

  // Calculate GP, NP, and Cashback when prices change
  useEffect(() => {
    const costPriceExclVat = Number.parseFloat(formData.costPrice) || 0
    const vatRate = Number.parseFloat(formData.vat) / 100
    const cashbackRate = Number.parseFloat(formData.cashbackRate) / 100

    const calculateProfit = (sellingPriceInclVat) => {
      const sellingPrice = Number.parseFloat(sellingPriceInclVat) || 0
      const sellingPriceExclVat = sellingPrice / (1 + vatRate)
      const gp = sellingPriceExclVat - costPriceExclVat
      const gpPercentage = costPriceExclVat > 0 ? (gp / costPriceExclVat) * 100 : 0
      const npPercentage = sellingPrice > 0 ? (gp / sellingPrice) * 100 : 0

      return {
        gp: gpPercentage.toFixed(2),
        np: npPercentage.toFixed(2),
      }
    }

    const calculateCashback = (sellingPriceInclVat) => {
      const sellingPrice = Number.parseFloat(sellingPriceInclVat) || 0
      const cashbackAmount = sellingPrice * cashbackRate
      return cashbackAmount.toFixed(2)
    }

    setCalculatedProfits({
      ...calculateProfit(formData.sellingPrice1),
      gp2: calculateProfit(formData.sellingPrice2).gp,
      np2: calculateProfit(formData.sellingPrice2).np,
      gp3: calculateProfit(formData.sellingPrice3).gp,
      np3: calculateProfit(formData.sellingPrice3).np,
    })

    setCalculatedCashback({
      cashback1: calculateCashback(formData.sellingPrice1),
      cashback2: calculateCashback(formData.sellingPrice2),
      cashback3: calculateCashback(formData.sellingPrice3),
    })
  }, [
    formData.costPrice,
    formData.sellingPrice1,
    formData.sellingPrice2,
    formData.sellingPrice3,
    formData.vat,
    formData.cashbackRate,
  ])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      })
    }
  }

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        setFormData({
          ...formData,
          image: file,
          imagePreview: event.target.result,
        })
      }

      reader.readAsDataURL(file)
    }
  }

  const generateProductCode = () => {
    // Generate alphanumeric code like A0101001
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const randomLetter = letters[Math.floor(Math.random() * letters.length)]
    const randomNumbers = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0")
    const productCode = `${randomLetter}01${randomNumbers.slice(0, 2)}${randomNumbers.slice(2)}`

    setFormData({
      ...formData,
      productCode: productCode,
    })
  }

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const barcode = `${formData.productCode || "ITM"}${timestamp}`
    setFormData({
      ...formData,
      productBarcode: barcode,
    })
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields validation
    if (!formData.productName) newErrors.productName = "Product name is required"
    if (!formData.productCode) newErrors.productCode = "Product code is required"
    if (!formData.category) newErrors.category = "Category is required"
    if (!formData.costPrice) newErrors.costPrice = "Cost price is required"
    if (!formData.sellingPrice1) newErrors.sellingPrice1 = "At least one selling price is required"
    if (!formData.stockUnits) newErrors.stockUnits = "Stock units is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (validateForm()) {
      try {
        console.log("Submitting form data:", formData)

        const result = await productService.createProduct(formData)

        if (result.success) {
          alert("Product created successfully!")
          if (!isEditMode) {
            resetForm()
          }
          if (onSubmit) {
            onSubmit(result.data)
          }
        } else {
          console.error("Product creation failed:", result.error)
          alert(`Failed to create product: ${result.error}`)
        }
      } catch (error) {
        console.error("Error creating product:", error)
        alert("Failed to create product. Please try again.")
      }
    }
  }

  const resetForm = () => {
    setFormData(initialFormState)
    setErrors({})
    setIsEditMode(false)
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Paper sx={{ p: 4, mb: 4, borderRadius: 3, boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)" }}>
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight="bold" color="#1976d2" gutterBottom>
            {isEditMode ? "Edit Product" : "Add New Product"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isEditMode ? "Update product information" : "Complete product information for inventory management"}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: BASIC INFORMATION */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
              <Typography variant="h6" fontWeight="600" color="#1976d2">
                📋 Basic Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Product Name"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    variant="outlined"
                    error={!!errors.productName}
                    helperText={errors.productName}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Product Code"
                    name="productCode"
                    value={formData.productCode}
                    onChange={handleChange}
                    placeholder="e.g., A0101001"
                    variant="outlined"
                    error={!!errors.productCode}
                    helperText={errors.productCode}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button size="small" onClick={generateProductCode} sx={{ textTransform: "none" }}>
                            Generate
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>UOM</InputLabel>
                    <Select name="uom" value={formData.uom} onChange={handleChange} label="UOM">
                      {uomOptions.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Pack Size"
                    name="packSize"
                    value={formData.packSize}
                    onChange={handleChange}
                    placeholder="e.g., 12pc"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>VAT Rate</InputLabel>
                    <Select name="vat" value={formData.vat} onChange={handleChange} label="VAT Rate">
                      {vatRates.map((rate) => (
                        <MenuItem key={rate} value={rate}>
                          {rate}%
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required error={!!errors.category}>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                      labelId="category-label"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      label="Category"
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected) {
                          return <em style={{ color: "#9e9e9e", fontStyle: "normal" }}>Select Category</em>
                        }
                        return selected
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: "auto",
                            minWidth: 200,
                          },
                        },
                      }}
                      sx={{
                        "& .MuiSelect-select": {
                          minHeight: "1.4375em",
                          display: "flex",
                          alignItems: "center",
                        },
                        "& .MuiInputLabel-root": {
                          transform: "translate(14px, 16px) scale(1)",
                        },
                        "& .MuiInputLabel-shrink": {
                          transform: "translate(14px, -9px) scale(0.75)",
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select Category</em>
                      </MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.name}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="subcategory-label">SubCategory</InputLabel>
                    <Select
                      labelId="subcategory-label"
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleChange}
                      label="SubCategory"
                      displayEmpty
                      disabled={!formData.category || subCategories.length === 0}
                      renderValue={(selected) => {
                        if (!selected) {
                          return (
                            <em
                              style={{
                                color: !formData.category || subCategories.length === 0 ? "#c0c0c0" : "#9e9e9e",
                                fontStyle: "normal",
                              }}
                            >
                              {!formData.category || subCategories.length === 0
                                ? "Select Category First"
                                : "Select SubCategory"}
                            </em>
                          )
                        }
                        return selected
                      }}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: "auto",
                            minWidth: 200,
                          },
                        },
                      }}
                      sx={{
                        "& .MuiSelect-select": {
                          minHeight: "1.4375em",
                          display: "flex",
                          alignItems: "center",
                        },
                        "& .MuiInputLabel-root": {
                          transform: "translate(14px, 16px) scale(1)",
                        },
                        "& .MuiInputLabel-shrink": {
                          transform: "translate(14px, -9px) scale(0.75)",
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select SubCategory</em>
                      </MenuItem>
                      {subCategories.map((subCat) => (
                        <MenuItem key={subCat.id} value={subCat.name}>
                          {subCat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Product Barcode"
                    name="productBarcode"
                    value={formData.productBarcode}
                    onChange={handleChange}
                    placeholder="Enter or generate barcode"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            onClick={generateBarcode}
                            startIcon={<QrCode />}
                            sx={{ textTransform: "none" }}
                          >
                            Generate
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="eTIMS Ref Code/Number"
                    name="etimsRefCode"
                    value={formData.etimsRefCode}
                    onChange={handleChange}
                    placeholder="Enter eTIMS reference"
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Short Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    variant="outlined"
                    placeholder="Brief product description for listings"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Detailed Description"
                    name="longerDescription"
                    value={formData.longerDescription}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    variant="outlined"
                    placeholder="Detailed product description"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* SECTION 2: PRICING INFORMATION */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
              <Typography variant="h6" fontWeight="600" color="#1976d2">
                💰 Pricing Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Cost Price (Excl. VAT)"
                    name="costPrice"
                    type="number"
                    value={formData.costPrice}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">KSh</InputAdornment>,
                    }}
                    variant="outlined"
                    error={!!errors.costPrice}
                    helperText={errors.costPrice || "Purchase price excluding VAT"}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customer Cashback Rate"
                    name="cashbackRate"
                    type="number"
                    value={formData.cashbackRate}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    variant="outlined"
                    helperText="Fixed cashback percentage (e.g., 3%) - applies to all quantities"
                  />
                </Grid>

                {/* Selling Prices and Quantities */}
                <Grid item xs={12}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                          <TableCell sx={{ fontWeight: 600, minWidth: 80 }}>Tier</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Quantity Range</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 160 }}>Selling Price (KSh)</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 80 }}>GP %</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 80 }}>NP %</TableCell>
                          <TableCell sx={{ fontWeight: 600, minWidth: 120 }}>Cashback Earned</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {/* Tier 1 */}
                        <TableRow>
                          <TableCell>
                            <Chip label="Tier 1" color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <TextField
                                type="number"
                                value={formData.qty1Min || "1"}
                                onChange={(e) => setFormData({ ...formData, qty1Min: e.target.value })}
                                size="small"
                                placeholder="Min"
                                sx={{ width: 70 }}
                                inputProps={{ min: 1 }}
                              />
                              <Typography variant="body2">to</Typography>
                              <TextField
                                type="number"
                                value={formData.qty1Max || "3"}
                                onChange={(e) => setFormData({ ...formData, qty1Max: e.target.value })}
                                size="small"
                                placeholder="Max"
                                sx={{ width: 70 }}
                                inputProps={{ min: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                pieces
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={formData.sellingPrice1}
                              onChange={handleChange}
                              name="sellingPrice1"
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">KSh</InputAdornment>,
                              }}
                              error={!!errors.sellingPrice1}
                              sx={{ width: 140 }}
                              placeholder="e.g., 100"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.gp || 0}%`} color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.np || 0}%`} color="info" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="primary" fontWeight="600">
                              KSh {calculatedCashback.cashback1 || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* Tier 2 */}
                        <TableRow>
                          <TableCell>
                            <Chip label="Tier 2" color="secondary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <TextField
                                type="number"
                                value={formData.qty2Min || "4"}
                                onChange={(e) => setFormData({ ...formData, qty2Min: e.target.value })}
                                size="small"
                                placeholder="Min"
                                sx={{ width: 70 }}
                                inputProps={{ min: 1 }}
                              />
                              <Typography variant="body2">to</Typography>
                              <TextField
                                type="number"
                                value={formData.qty2Max || "11"}
                                onChange={(e) => setFormData({ ...formData, qty2Max: e.target.value })}
                                size="small"
                                placeholder="Max"
                                sx={{ width: 70 }}
                                inputProps={{ min: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                pieces
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={formData.sellingPrice2}
                              onChange={handleChange}
                              name="sellingPrice2"
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">KSh</InputAdornment>,
                              }}
                              sx={{ width: 140 }}
                              placeholder="e.g., 90"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.gp2 || 0}%`} color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.np2 || 0}%`} color="info" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="primary" fontWeight="600">
                              KSh {calculatedCashback.cashback2 || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>

                        {/* Tier 3 */}
                        <TableRow>
                          <TableCell>
                            <Chip label="Tier 3" color="warning" size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <TextField
                                type="number"
                                value={formData.qty3Min || "12"}
                                onChange={(e) => setFormData({ ...formData, qty3Min: e.target.value })}
                                size="small"
                                placeholder="Min"
                                sx={{ width: 70 }}
                                inputProps={{ min: 1 }}
                              />
                              <Typography variant="body2">and above</Typography>
                              <Typography variant="caption" color="text.secondary">
                                pieces
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={formData.sellingPrice3}
                              onChange={handleChange}
                              name="sellingPrice3"
                              size="small"
                              InputProps={{
                                startAdornment: <InputAdornment position="start">KSh</InputAdornment>,
                              }}
                              sx={{ width: 140 }}
                              placeholder="e.g., 80"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.gp3 || 0}%`} color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={`${calculatedProfits.np3 || 0}%`} color="info" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="primary" fontWeight="600">
                              KSh {calculatedCashback.cashback3 || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Cashback rate applies to all purchases regardless of quantity
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* SECTION 3: VENDOR INFORMATION */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
              <Typography variant="h6" fontWeight="600" color="#1976d2">
                🏢 Vendor Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Preferred Vendor 1"
                    name="preferredVendor1"
                    value={formData.preferredVendor1}
                    onChange={handleChange}
                    placeholder="Primary vendor name"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Preferred Vendor 2"
                    name="preferredVendor2"
                    value={formData.preferredVendor2}
                    onChange={handleChange}
                    placeholder="Secondary vendor name"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Vendor Item Code"
                    name="vendorItemCode"
                    value={formData.vendorItemCode}
                    onChange={handleChange}
                    placeholder="Vendor's product code"
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* SECTION 4: SALES AGENT INCENTIVES */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
              <Typography variant="h6" fontWeight="600" color="#1976d2">
                🎯 Sales Agent Incentives
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Configure cashback percentages for sales agents based on customer purchase sequence
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="1st Purchase Cashback"
                    name="saCashback1stPurchase"
                    type="number"
                    value={formData.saCashback1stPurchase}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    variant="outlined"
                    helperText="Default: 6%"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="2nd Purchase Cashback"
                    name="saCashback2ndPurchase"
                    type="number"
                    value={formData.saCashback2ndPurchase}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    variant="outlined"
                    helperText="Default: 4%"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="3rd Purchase Cashback"
                    name="saCashback3rdPurchase"
                    type="number"
                    value={formData.saCashback3rdPurchase}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    variant="outlined"
                    helperText="Default: 3%"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="4th+ Purchase Cashback"
                    name="saCashback4thPurchase"
                    type="number"
                    value={formData.saCashback4thPurchase}
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    variant="outlined"
                    helperText="Default: 2%"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* SECTION 5: INVENTORY & ADDITIONAL INFO */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
              <Typography variant="h6" fontWeight="600" color="#1976d2">
                📦 Inventory & Additional Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="Current Stock Quantity"
                        name="stockUnits"
                        type="number"
                        value={formData.stockUnits}
                        onChange={handleChange}
                        variant="outlined"
                        error={!!errors.stockUnits}
                        helperText={errors.stockUnits}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Alert Quantity"
                        name="alertQuantity"
                        type="number"
                        value={formData.alertQuantity}
                        onChange={handleChange}
                        variant="outlined"
                        helperText="Low stock alert threshold"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Reorder Level"
                        name="reorderLevel"
                        type="number"
                        value={formData.reorderLevel}
                        onChange={handleChange}
                        variant="outlined"
                        helperText="Automatic reorder trigger point"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Order Level"
                        name="orderLevel"
                        type="number"
                        value={formData.orderLevel}
                        onChange={handleChange}
                        variant="outlined"
                        helperText="Standard order quantity"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.reorderActive}
                            onChange={handleChange}
                            name="reorderActive"
                            color="primary"
                          />
                        }
                        label="Auto Reorder Active"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Expiry Date"
                        name="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        helperText="Leave empty if not applicable"
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Product Photo
                  </Typography>
                  <Card
                    sx={{
                      border: "2px dashed #e0e0e0",
                      textAlign: "center",
                      p: 3,
                      borderRadius: 2,
                      bgcolor: "#fafafa",
                      height: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {formData.imagePreview ? (
                      <Box sx={{ width: "100%", height: "100%" }}>
                        <img
                          src={formData.imagePreview || "/placeholder.svg?height=120&width=250"}
                          alt="Product preview"
                          style={{
                            width: "100%",
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            marginBottom: "8px",
                          }}
                        />
                        <Button variant="outlined" component="label" size="small" sx={{ textTransform: "none" }}>
                          Change Photo
                          <input type="file" hidden onChange={handleImageChange} accept="image/*" />
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <ImageIcon sx={{ fontSize: 48, color: "#bdbdbd", mb: 1 }} />
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<Upload />}
                          sx={{
                            bgcolor: "#1976d2",
                            "&:hover": { bgcolor: "#1565c0" },
                            textTransform: "none",
                            mb: 1,
                          }}
                        >
                          Upload Photo
                          <input type="file" hidden onChange={handleImageChange} accept="image/*" />
                        </Button>
                        <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                          Max 5MB, JPG/PNG
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Submit Buttons */}
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#1976d2",
                "&:hover": { bgcolor: "#1565c0" },
                px: 6,
                py: 1.5,
                fontSize: "1.1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 3,
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                mr: 2,
              }}
            >
              {isEditMode ? "Update Product" : "Add Product"}
            </Button>
            {isEditMode && (
              <Button
                type="button"
                variant="outlined"
                size="large"
                onClick={resetForm}
                sx={{
                  px: 6,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  textTransform: "none",
                  borderRadius: 3,
                }}
              >
                Cancel Edit
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Box>
  )
}
