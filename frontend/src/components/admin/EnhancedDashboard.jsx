"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material"
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  People,
  Inventory,
  AttachMoney,
  Download,
  Refresh,
  FullscreenExit,
  Fullscreen,
  Settings,
} from "@mui/icons-material"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

/**
 * Enhanced metric card component with gradient background and hover effects
 * Optimized for cartesian plane layout with consistent spacing
 */
const MetricCard = ({ title, value, change, changeType, icon, color = "#1976d2", subtitle }) => {
  return (
    <Card
      sx={{
        height: "100%",
        // Enhanced gradient background for visual depth
        background: `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.06)} 100%)`,
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: 3, // Increased border radius for modern look
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth easing
        // Enhanced hover effects
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 12px 32px ${alpha(color, 0.2)}`,
          border: `1px solid ${alpha(color, 0.4)}`,
        },
        position: "relative",
        overflow: "hidden",
        // Consistent margin for cartesian spacing
        mx: 1.5, // Horizontal margin for grid spacing
        my: 1, // Vertical margin for row spacing
      }}
    >
      <CardContent
        sx={{
          p: 3.5, // Generous padding for better content spacing
          "&:last-child": { pb: 3.5 }, // Consistent bottom padding
        }}
      >
        {/* Header section with icon and trend indicator */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <Avatar
            sx={{
              bgcolor: color,
              width: 48, // Larger icon for better visibility
              height: 48,
              boxShadow: `0 4px 12px ${alpha(color, 0.3)}`, // Icon shadow
            }}
          >
            {icon}
          </Avatar>
          {/* Enhanced trend indicator */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            {changeType === "increase" ? (
              <TrendingUp sx={{ color: "#2e7d32", fontSize: 22 }} />
            ) : (
              <TrendingDown sx={{ color: "#d32f2f", fontSize: 22 }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: changeType === "increase" ? "#2e7d32" : "#d32f2f",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {change}
            </Typography>
          </Box>
        </Box>

        {/* Main value display with enhanced typography */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            color: "#1a1a1a",
            mb: 1.5,
            fontSize: { xs: "1.8rem", sm: "2.2rem", md: "2.5rem" }, // Responsive font size
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>

        {/* Title and subtitle with improved spacing */}
        <Typography
          variant="body1"
          sx={{
            color: "#555",
            fontWeight: 600,
            mb: 0.8,
            fontSize: "1rem",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: "#777",
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>

      {/* Enhanced bottom accent bar */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4, // Slightly thicker accent
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
        }}
      />
    </Card>
  )
}

/**
 * Enhanced chart container component optimized for cartesian plane layout
 * Features improved spacing, borders, and responsive design
 */
const ChartContainer = ({ title, children, height = 400, actions, quadrant = "" }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const open = Boolean(anchorEl)

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <Paper
      sx={{
        // Enhanced padding and spacing for cartesian layout
        p: 4, // Increased padding for better content spacing
        borderRadius: 3, // Consistent with metric cards
        height: "100%",
        width: "100%",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        // Cartesian plane specific margins
        mx: 2, // Horizontal margin between quadrants
        my: 2, // Vertical margin between quadrant rows
        // Enhanced visual depth
        boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.08)",
        // Hover effects for interactivity
        "&:hover": {
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          transform: "translateY(-3px)",
        },
        // Fullscreen mode styling
        ...(isFullscreen && {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
          m: 0,
          borderRadius: 0,
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
        }),
      }}
    >
      {/* Enhanced chart header with quadrant indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4, // Increased margin for better separation
          pb: 2.5, // Increased padding bottom
          borderBottom: "2px solid #f0f0f0", // More prominent separator
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: "1.4rem",
              color: "#1a1a1a",
              letterSpacing: "-0.02em", // Improved letter spacing
            }}
          >
            {title}
          </Typography>
          {/* Quadrant indicator badge */}
          {quadrant && (
            <Chip
              label={quadrant}
              size="small"
              sx={{
                backgroundColor: alpha("#1976d2", 0.12),
                color: "#1976d2",
                fontWeight: 700,
                fontSize: "0.8rem",
                height: 28,
              }}
            />
          )}
        </Box>

        {/* Enhanced action buttons */}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {actions && actions}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{
                backgroundColor: alpha("#1976d2", 0.1),
                "&:hover": { backgroundColor: alpha("#1976d2", 0.2) },
                width: 36,
                height: 36,
              }}
            >
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Enhanced dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid rgba(0,0,0,0.06)",
            },
          }}
        >
          <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
            <Download fontSize="small" sx={{ mr: 2 }} /> Export Data
          </MenuItem>
          <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
            <Refresh fontSize="small" sx={{ mr: 2 }} /> Refresh
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
            <Settings fontSize="small" sx={{ mr: 2 }} /> Chart Settings
          </MenuItem>
        </Menu>
      </Box>

      {/* Chart content area with enhanced spacing */}
      <Box
        sx={{
          height: isFullscreen ? "calc(100% - 120px)" : "calc(100% - 100px)",
          width: "100%",
          // Enhanced padding around chart content
          p: 2.5,
          borderRadius: 2,
          backgroundColor: "#fafbfc",
          border: "1px solid #f0f2f5",
        }}
      >
        {children}
      </Box>
    </Paper>
  )
}

/**
 * Sales Performance Chart - Upper Left Quadrant (Q1)
 * Enhanced with better styling and responsive design
 */
const SalesTrendChart = () => {
  const [timeRange, setTimeRange] = useState(0)

  const handleTimeRangeChange = (event, newValue) => {
    setTimeRange(newValue)
  }

  // Enhanced sales data with more data points
  const salesData = [
    { month: "Jan", sales: 65000, orders: 120, target: 60000 },
    { month: "Feb", sales: 78000, orders: 145, target: 70000 },
    { month: "Mar", sales: 92000, orders: 168, target: 80000 },
    { month: "Apr", sales: 85000, orders: 155, target: 85000 },
    { month: "May", sales: 110000, orders: 195, target: 90000 },
    { month: "Jun", sales: 125000, orders: 220, target: 95000 },
  ]

  // Enhanced time range selector
  const timeRangeActions = (
    <Tabs
      value={timeRange}
      onChange={handleTimeRangeChange}
      sx={{
        minHeight: 38,
        "& .MuiTab-root": {
          minHeight: 38,
          py: 0,
          px: 2.5,
          fontWeight: 600,
          fontSize: "0.9rem",
        },
      }}
    >
      <Tab label="6M" />
      <Tab label="YTD" />
      <Tab label="1Y" />
    </Tabs>
  )

  return (
    <ChartContainer title="Sales Performance" actions={timeRangeActions} quadrant="Q1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={salesData} margin={{ top: 30, right: 40, left: 30, bottom: 30 }}>
          {/* Enhanced gradient definitions */}
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1976d2" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
            tick={{ fontSize: 13, fontWeight: 500 }}
          />
          <RechartsTooltip
            formatter={(value, name) => [
              `KSh ${value.toLocaleString()}`,
              name === "sales" ? "Sales" : name === "target" ? "Target" : "Orders",
            ]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#1976d2"
            strokeWidth={3}
            fill="url(#colorSales)"
            activeDot={{ r: 8, strokeWidth: 2 }}
          />
          <Line type="monotone" dataKey="target" stroke="#4caf50" strokeWidth={3} strokeDasharray="8 4" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

/**
 * Category Performance Chart - Upper Right Quadrant (Q2)
 * Enhanced pie chart with better visual design
 */
const CategoryChart = () => {
  // Enhanced category data with more vibrant colors
  const categoryData = [
    { name: "Art Supplies", value: 35, color: "#1976d2" },
    { name: "Stationery", value: 28, color: "#4caf50" },
    { name: "IT & Accessories", value: 20, color: "#ff9800" },
    { name: "Furniture", value: 12, color: "#9c27b0" },
    { name: "Others", value: 5, color: "#f44336" },
  ]

  // Enhanced custom label renderer
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={14}
        fontWeight={700}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ChartContainer title="Sales by Category" quadrant="Q2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={140}
            innerRadius={45} // Added inner radius for donut effect
            paddingAngle={3} // Small padding between segments
            dataKey="value"
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value) => [`${value}%`, "Percentage"]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            formatter={(value) => <span style={{ color: "#333", fontWeight: 600, fontSize: "0.95rem" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

/**
 * Revenue vs Target Chart - Lower Left Quadrant (Q3)
 * Enhanced bar chart with improved styling
 */
const RevenueChart = () => {
  // Enhanced revenue data
  const revenueData = [
    { month: "Jan", revenue: 65000, target: 70000 },
    { month: "Feb", revenue: 78000, target: 75000 },
    { month: "Mar", revenue: 92000, target: 80000 },
    { month: "Apr", revenue: 85000, target: 85000 },
    { month: "May", revenue: 110000, target: 90000 },
    { month: "Jun", revenue: 125000, target: 95000 },
  ]

  return (
    <ChartContainer title="Revenue vs Target" quadrant="Q3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={revenueData} margin={{ top: 30, right: 40, left: 30, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
            tick={{ fontSize: 13, fontWeight: 500 }}
          />
          <RechartsTooltip
            formatter={(value) => [`KSh ${value.toLocaleString()}`]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#1976d2" radius={[6, 6, 0, 0]} barSize={28} name="Revenue" />
          <Bar dataKey="target" fill="#4caf50" radius={[6, 6, 0, 0]} barSize={28} name="Target" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

/**
 * Customer Acquisition Chart - Lower Right Quadrant (Q4)
 * Enhanced line chart with improved visual design
 */
const CustomerAcquisitionChart = () => {
  // Enhanced customer acquisition data
  const acquisitionData = [
    { name: "Jan", new: 45, returning: 30 },
    { name: "Feb", new: 52, returning: 35 },
    { name: "Mar", new: 61, returning: 42 },
    { name: "Apr", new: 55, returning: 45 },
    { name: "May", new: 70, returning: 50 },
    { name: "Jun", new: 75, returning: 55 },
  ]

  return (
    <ChartContainer title="Customer Acquisition" quadrant="Q4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={acquisitionData} margin={{ top: 30, right: 40, left: 30, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eaed" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 500 }} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="new"
            stroke="#1976d2"
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2 }}
            name="New Customers"
          />
          <Line
            type="monotone"
            dataKey="returning"
            stroke="#ff9800"
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2 }}
            name="Returning Customers"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

/**
 * Top Products Table Component - Full Width Bottom Section
 * Enhanced with better styling and spacing
 */
const TopProducts = () => {
  // Enhanced products data with placeholder images for build stability
  const products = [
    {
      id: 1,
      name: "Acrylic Paint Set",
      sales: 156,
      revenue: "KSh 23,400",
      trend: "up",
      image: "/placeholder.svg?height=52&width=52", // Placeholder for acrylic paint set
      growth: "+12%",
    },
    {
      id: 2,
      name: "Professional Sketch Pad",
      sales: 134,
      revenue: "KSh 18,760",
      trend: "up",
      image: "/placeholder.svg?height=52&width=52", // Placeholder for sketch pad
      growth: "+8%",
    },
    {
      id: 3,
      name: "Colored Pencil Set",
      sales: 98,
      revenue: "KSh 14,700",
      trend: "down",
      image: "/placeholder.svg?height=52&width=52", // Placeholder for colored pencils
      growth: "-3%",
    },
    {
      id: 4,
      name: "Exercise Books Pack",
      sales: 87,
      revenue: "KSh 8,700",
      trend: "up",
      image: "/placeholder.svg?height=52&width=52", // Placeholder for exercise books
      growth: "+5%",
    },
    {
      id: 5,
      name: "Watercolor Set",
      sales: 76,
      revenue: "KSh 11,400",
      trend: "up",
      image: "/placeholder.svg?height=52&width=52", // Placeholder for watercolor set
      growth: "+7%",
    },
  ]

  return (
    <Paper
      sx={{
        // Enhanced styling for full-width section
        p: 4,
        borderRadius: 3,
        mx: 2, // Consistent with quadrant margins
        my: 3, // Vertical margin for separation from quadrants
        boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.08)",
        "&:hover": {
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        },
      }}
    >
      {/* Enhanced header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
          pb: 2.5,
          borderBottom: "2px solid #f0f0f0",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: "1.4rem",
            color: "#1a1a1a",
            letterSpacing: "-0.02em",
          }}
        >
          Top Selling Products
        </Typography>
        <Chip
          label="Full Width"
          size="small"
          sx={{
            backgroundColor: alpha("#4caf50", 0.12),
            color: "#4caf50",
            fontWeight: 700,
            fontSize: "0.8rem",
            height: 28,
          }}
        />
      </Box>

      {/* Enhanced table container */}
      <TableContainer
        sx={{
          borderRadius: 2,
          border: "1px solid #f0f2f5",
          backgroundColor: "#fafbfc",
        }}
      >
        <Table size="medium" stickyHeader>
          {/* Enhanced table header */}
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#f8f9fa",
                  py: 3.5,
                  fontSize: "1rem",
                  borderBottom: "2px solid #e9ecef",
                  color: "#495057",
                }}
              >
                Product
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#f8f9fa",
                  py: 3.5,
                  fontSize: "1rem",
                  borderBottom: "2px solid #e9ecef",
                  color: "#495057",
                }}
              >
                Sales
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#f8f9fa",
                  py: 3.5,
                  fontSize: "1rem",
                  borderBottom: "2px solid #e9ecef",
                  color: "#495057",
                }}
              >
                Revenue
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#f8f9fa",
                  py: 3.5,
                  fontSize: "1rem",
                  borderBottom: "2px solid #e9ecef",
                  color: "#495057",
                }}
              >
                Growth
              </TableCell>
            </TableRow>
          </TableHead>

          {/* Enhanced table body */}
          <TableBody>
            {products.map((product, index) => (
              <TableRow
                key={product.id}
                hover
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: alpha("#1976d2", 0.06),
                    transform: "scale(1.005)",
                  },
                  backgroundColor: index % 2 === 0 ? "#fff" : "#fafbfc", // Alternating row colors
                }}
              >
                {/* Enhanced product cell */}
                <TableCell sx={{ py: 3.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Avatar
                      src={product.image}
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2.5,
                        boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
                      }}
                      variant="rounded"
                      alt={product.name}
                    />
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        color: "#1a1a1a",
                      }}
                    >
                      {product.name}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Enhanced sales cell */}
                <TableCell align="right" sx={{ py: 3.5 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "#1a1a1a",
                    }}
                  >
                    {product.sales}
                  </Typography>
                </TableCell>

                {/* Enhanced revenue cell */}
                <TableCell align="right" sx={{ py: 3.5 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1976d2",
                      fontSize: "1rem",
                    }}
                  >
                    {product.revenue}
                  </Typography>
                </TableCell>

                {/* Enhanced growth cell */}
                <TableCell align="right" sx={{ py: 3.5 }}>
                  <Chip
                    icon={product.trend === "up" ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                    label={product.growth}
                    size="medium"
                    sx={{
                      backgroundColor: product.trend === "up" ? alpha("#4caf50", 0.12) : alpha("#f44336", 0.12),
                      color: product.trend === "up" ? "#2e7d32" : "#d32f2f",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      height: 32,
                      "& .MuiChip-icon": {
                        color: "inherit",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

/**
 * Main Enhanced Dashboard Component
 * Implements clean cartesian plane layout with optimal spacing and responsive design
 */
const EnhancedDashboard = () => {
  const [loading, setLoading] = useState(true)
  const theme = useTheme()

  // Simulate loading state with realistic timing
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Enhanced loading state
  if (loading) {
    return (
      <Box
        sx={{
          p: 4,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f9fafc",
        }}
      >
        <LinearProgress
          sx={{
            width: "60%",
            mb: 4,
            borderRadius: 2,
            height: 6,
          }}
        />
        <Typography
          variant="h5"
          sx={{
            color: "#666",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          Loading dashboard data...
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "#999",
            textAlign: "center",
            mt: 1,
          }}
        ></Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: "100vw", // Full viewport width
        minHeight: "100vh", // Full viewport height
        backgroundColor: "#f9fafc", // Light background
        // Enhanced responsive padding for cartesian layout
        px: { xs: 2, sm: 3, md: 4, lg: 5 }, // Progressive padding
        py: { xs: 3, sm: 4, md: 5 }, // Vertical padding
        boxSizing: "border-box",
        margin: 0,
        overflow: "auto", // Allow scrolling if needed
      }}
    >
      {/* Streamlined Metrics Grid Section - Only 4 metrics */}
      <Grid container spacing={3} sx={{ mb: 6, width: "100%", maxWidth: "none" }}>
        <Grid item xs={6} sm={3} md={3}>
          <MetricCard
            title="Total Sales"
            value="KSh 1.2M"
            change="+12.5%"
            changeType="increase"
            icon={<AttachMoney />}
            color="#1976d2"
            subtitle="vs. last month"
          />
        </Grid>
        <Grid item xs={6} sm={3} md={3}>
          <MetricCard
            title="Total Orders"
            value="2,847"
            change="+8.2%"
            changeType="increase"
            icon={<ShoppingCart />}
            color="#4caf50"
            subtitle="vs. last month"
          />
        </Grid>
        <Grid item xs={6} sm={3} md={3}>
          <MetricCard
            title="Active Customers"
            value="1,234"
            change="+15.3%"
            changeType="increase"
            icon={<People />}
            color="#ff9800"
            subtitle="vs. last month"
          />
        </Grid>
        <Grid item xs={6} sm={3} md={3}>
          <MetricCard
            title="Products in Stock"
            value="456"
            change="-2.1%"
            changeType="decrease"
            icon={<Inventory />}
            color="#9c27b0"
            subtitle="vs. last month"
          />
        </Grid>
      </Grid>

      {/* CARTESIAN PLANE LAYOUT - Four Quadrants */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "none",
          mb: 6, // Margin before full-width section
          // Create cartesian plane container with enhanced visual structure
          display: "flex",
          flexDirection: "column",
          gap: 5, // Vertical gap between quadrant rows
          // Enhanced plane boundary styling
          border: "3px dashed rgba(25, 118, 210, 0.15)",
          borderRadius: 4,
          p: 4,
          backgroundColor: "rgba(25, 118, 210, 0.03)",
          position: "relative",
          // Add subtle grid pattern
          backgroundImage: `
            linear-gradient(rgba(25, 118, 210, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(25, 118, 210, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      >
        {/* UPPER QUADRANTS ROW */}
        <Grid container spacing={5} sx={{ width: "100%", maxWidth: "none" }}>
          {/* UPPER LEFT QUADRANT - Q1 - Sales Performance */}
          <Grid item xs={12} lg={6} sx={{ height: { xs: "auto", lg: 550 } }}>
            <Box sx={{ height: "100%", minHeight: 500 }}>
              <SalesTrendChart />
            </Box>
          </Grid>

          {/* UPPER RIGHT QUADRANT - Q2 - Sales by Category */}
          <Grid item xs={12} lg={6} sx={{ height: { xs: "auto", lg: 550 } }}>
            <Box sx={{ height: "100%", minHeight: 500 }}>
              <CategoryChart />
            </Box>
          </Grid>
        </Grid>

        {/* LOWER QUADRANTS ROW */}
        <Grid container spacing={5} sx={{ width: "100%", maxWidth: "none" }}>
          {/* LOWER LEFT QUADRANT - Q3 - Revenue vs Target */}
          <Grid item xs={12} lg={6} sx={{ height: { xs: "auto", lg: 550 } }}>
            <Box sx={{ height: "100%", minHeight: 500 }}>
              <RevenueChart />
            </Box>
          </Grid>

          {/* LOWER RIGHT QUADRANT - Q4 - Customer Acquisition */}
          <Grid item xs={12} lg={6} sx={{ height: { xs: "auto", lg: 550 } }}>
            <Box sx={{ height: "100%", minHeight: 500 }}>
              <CustomerAcquisitionChart />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* FULL WIDTH BOTTOM SECTION - Top Selling Products */}
      <Box sx={{ width: "100%", maxWidth: "none" }}>
        <TopProducts />
      </Box>
    </Box>
  )
}

export default EnhancedDashboard
