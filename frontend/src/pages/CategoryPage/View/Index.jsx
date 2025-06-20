"use client"

import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Box,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material"
import {
  Home as HomeIcon,
  ShoppingCart as ShoppingCartIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Search as SearchIcon,
} from "@mui/icons-material"
import { useTheme } from "@mui/material/styles"
// CHANGE: Import the API hooks from the correct location following your project structure
import { useProducts, useCategories } from "../../../hooks/useApiData"

// CHANGE: Create CategoryPage component following your existing component structure
const CategoryPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()

  // CHANGE: State management for category page functionality
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState("name")
  const [searchTerm, setSearchTerm] = useState("")
  const [wishlist, setWishlist] = useState([])
  const [cart, setCart] = useState([])
  const productsPerPage = 12

  // CHANGE: Load wishlist and cart from localStorage on component mount
  useEffect(() => {
    const storedWishlist = JSON.parse(localStorage.getItem("wishlist")) || []
    const storedCart = JSON.parse(localStorage.getItem("cartItems")) || []
    setWishlist(storedWishlist)
    setCart(storedCart)
  }, [])

  // CHANGE: Fetch categories and products using your existing API hooks
  const { data: categoriesData, loading: categoriesLoading, error: categoriesError } = useCategories()
  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
  } = useProducts({
    category: slug,
    page: currentPage,
    limit: productsPerPage,
    search: searchTerm,
    sortBy: sortBy,
  })

  // CHANGE: Process category data to find current category
  const currentCategory = React.useMemo(() => {
    if (!categoriesData?.data?.categories) return null

    // Convert slug back to category name for matching
    const categoryName = slug.replace(/-/g, " ")
    return categoriesData.data.categories.find((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())
  }, [categoriesData, slug])

  // CHANGE: Process products data with error handling
  const products = React.useMemo(() => {
    if (!productsData?.data?.products) return []
    return productsData.data.products
  }, [productsData])

  // CHANGE: Calculate pagination
  const totalProducts = productsData?.data?.total || 0
  const totalPages = Math.ceil(totalProducts / productsPerPage)

  // CHANGE: Wishlist management functions following your existing pattern
  const handleWishlistToggle = (product) => {
    const isInWishlist = wishlist.some((item) => item.id === product.id)
    let updatedWishlist

    if (isInWishlist) {
      updatedWishlist = wishlist.filter((item) => item.id !== product.id)
    } else {
      updatedWishlist = [...wishlist, product]
    }

    setWishlist(updatedWishlist)
    localStorage.setItem("wishlist", JSON.stringify(updatedWishlist))
  }

  // CHANGE: Cart management functions following your existing pattern
  const handleAddToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)
    let updatedCart

    if (existingItem) {
      updatedCart = cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      updatedCart = [...cart, { ...product, quantity: 1 }]
    }

    setCart(updatedCart)
    localStorage.setItem("cartItems", JSON.stringify(updatedCart))
  }

  // CHANGE: Handle page changes
  const handlePageChange = (event, value) => {
    setCurrentPage(value)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // CHANGE: Handle sort changes
  const handleSortChange = (event) => {
    setSortBy(event.target.value)
    setCurrentPage(1) // Reset to first page when sorting
  }

  // CHANGE: Handle search
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // CHANGE: Loading skeleton component following Material-UI patterns
  const ProductSkeleton = () => (
    <Card sx={{ height: "100%" }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" height={32} />
        <Skeleton variant="text" height={24} />
        <Skeleton variant="text" width="60%" />
      </CardContent>
      <CardActions>
        <Skeleton variant="rectangular" width={80} height={36} />
        <Skeleton variant="circular" width={40} height={40} />
      </CardActions>
    </Card>
  )

  // CHANGE: Error handling component
  if (categoriesError || productsError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {categoriesError || productsError || "Failed to load category data"}
        </Alert>
        <Button variant="contained" onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* CHANGE: Breadcrumb navigation following Material-UI patterns */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link
          underline="hover"
          color="inherit"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate("/")
          }}
          sx={{ display: "flex", alignItems: "center" }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Typography color="text.primary">{currentCategory?.name || slug.replace(/-/g, " ")}</Typography>
      </Breadcrumbs>

      {/* CHANGE: Category header with description */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {currentCategory?.name || slug.replace(/-/g, " ")}
        </Typography>
        {currentCategory?.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {currentCategory.description}
          </Typography>
        )}
        <Chip label={`${totalProducts} products found`} color="primary" variant="outlined" />
      </Box>

      {/* CHANGE: Search and filter controls */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <TextField
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sortBy} onChange={handleSortChange} label="Sort By">
            <MenuItem value="name">Name A-Z</MenuItem>
            <MenuItem value="-name">Name Z-A</MenuItem>
            <MenuItem value="price">Price Low-High</MenuItem>
            <MenuItem value="-price">Price High-Low</MenuItem>
            <MenuItem value="-createdAt">Newest First</MenuItem>
            <MenuItem value="createdAt">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* CHANGE: Products grid with loading states */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {productsLoading
          ? // Show loading skeletons
            Array.from({ length: productsPerPage }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <ProductSkeleton />
              </Grid>
            ))
          : // Show actual products
            products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.image || "/placeholder.svg?height=200&width=200"}
                    alt={product.name}
                    sx={{ objectFit: "cover", cursor: "pointer" }}
                    onClick={() => navigate(`/product-details/${product.id}`)}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography
                      gutterBottom
                      variant="h6"
                      component="h2"
                      sx={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        "&:hover": { color: theme.palette.primary.main },
                      }}
                      onClick={() => navigate(`/product-details/${product.id}`)}
                    >
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {product.description?.substring(0, 100)}
                      {product.description?.length > 100 && "..."}
                    </Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      KSh {product.price?.toLocaleString() || "0"}
                    </Typography>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <Typography variant="body2" sx={{ textDecoration: "line-through", color: "text.secondary" }}>
                        KSh {product.originalPrice.toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ShoppingCartIcon />}
                      onClick={() => handleAddToCart(product)}
                      sx={{ flexGrow: 1, mr: 1 }}
                    >
                      Add to Cart
                    </Button>
                    <IconButton
                      color={wishlist.some((item) => item.id === product.id) ? "error" : "default"}
                      onClick={() => handleWishlistToggle(product)}
                    >
                      {wishlist.some((item) => item.id === product.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* CHANGE: Empty state when no products found */}
      {!productsLoading && products.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No products found in this category
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search terms or browse other categories
          </Typography>
          <Button variant="contained" onClick={() => navigate("/")}>
            Browse All Categories
          </Button>
        </Box>
      )}

      {/* CHANGE: Pagination component */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Container>
  )
}

export default CategoryPage
