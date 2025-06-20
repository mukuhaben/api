"use client"

import { useState, useRef } from "react"
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Badge,
  Alert,
  Snackbar,
  InputAdornment,
  Menu,
  ListItemIcon,
  useTheme,
  useMediaQuery,
} from "@mui/material"
import {
  Add,
  Edit,
  Delete,
  Person,
  TrendingUp,
  Assignment,
  Phone,
  Visibility,
  Email,
  PhotoCamera,
  Search,
  MoreVert,
  LocationOn,
  CalendarToday,
  Group,
  PersonAdd,
  Close,
  Save,
  Cancel,
} from "@mui/icons-material"

// Mock data for sales agents with comprehensive information
const initialAgents = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@firstcraft.com",
    phone: "+254 722 123 456",
    nationalId: "12345678",
    territory: "Nairobi Central",
    salesTarget: 5000000,
    salesAchieved: 3750000,
    customersAssigned: 25,
    status: "active",
    joinDate: "2023-01-15",
    commission: 8,
    photo: "/placeholder.svg?height=100&width=100",
    address: "123 Kenyatta Avenue, Nairobi",
    emergencyContact: "+254 733 987 654",
    bankAccount: "1234567890",
    customers: [
      {
        id: 101,
        name: "Alpha Investments Ltd",
        email: "info@alphainvestments.co.ke",
        phone: "+254 700 111 222",
        company: "Alpha Investments",
        dateOnboarded: "2023-02-20",
        lastOrder: "2024-01-20",
        orderValue: 1200000,
        totalOrders: 15,
        status: "Active",
      },
      {
        id: 102,
        name: "Beta Corporation",
        email: "procurement@betacorp.co.ke",
        phone: "+254 700 333 444",
        company: "Beta Corp",
        dateOnboarded: "2023-03-15",
        lastOrder: "2024-02-15",
        orderValue: 850000,
        totalOrders: 12,
        status: "Active",
      },
      {
        id: 103,
        name: "Gamma Solutions",
        email: "orders@gammasolutions.co.ke",
        phone: "+254 700 555 666",
        company: "Gamma Solutions",
        dateOnboarded: "2023-04-10",
        lastOrder: "2024-01-30",
        orderValue: 650000,
        totalOrders: 8,
        status: "Active",
      },
    ],
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@firstcraft.com",
    phone: "+254 733 987 654",
    nationalId: "87654321",
    territory: "Mombasa",
    salesTarget: 4000000,
    salesAchieved: 4200000,
    customersAssigned: 20,
    status: "active",
    joinDate: "2023-03-20",
    commission: 10,
    photo: "/placeholder.svg?height=100&width=100",
    address: "456 Moi Avenue, Mombasa",
    emergencyContact: "+254 722 111 333",
    bankAccount: "0987654321",
    customers: [
      {
        id: 201,
        name: "Delta Enterprises",
        email: "info@deltaenterprises.co.ke",
        phone: "+254 700 777 888",
        company: "Delta Enterprises",
        dateOnboarded: "2023-04-01",
        lastOrder: "2024-02-01",
        orderValue: 950000,
        totalOrders: 18,
        status: "Active",
      },
      {
        id: 202,
        name: "Epsilon Trading",
        email: "sales@epsilontrading.co.ke",
        phone: "+254 700 999 000",
        company: "Epsilon Trading",
        dateOnboarded: "2023-05-15",
        lastOrder: "2024-02-28",
        orderValue: 1100000,
        totalOrders: 22,
        status: "Active",
      },
    ],
  },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob.johnson@firstcraft.com",
    phone: "+254 711 555 777",
    nationalId: "11223344",
    territory: "Kisumu",
    salesTarget: 3500000,
    salesAchieved: 2100000,
    customersAssigned: 18,
    status: "inactive",
    joinDate: "2022-11-10",
    commission: 7,
    photo: "/placeholder.svg?height=100&width=100",
    address: "789 Oginga Odinga Street, Kisumu",
    emergencyContact: "+254 722 444 555",
    bankAccount: "1122334455",
    customers: [
      {
        id: 301,
        name: "Zeta Group",
        email: "procurement@zetagroup.co.ke",
        phone: "+254 700 123 789",
        company: "Zeta Group",
        dateOnboarded: "2023-01-10",
        lastOrder: "2024-01-10",
        orderValue: 700000,
        totalOrders: 10,
        status: "Inactive",
      },
    ],
  },
]

const territories = [
  "Nairobi Central",
  "Nairobi West",
  "Nairobi East",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Machakos",
  "Meru",
]

export default function SalesAgentAdminPanel() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const fileInputRef = useRef(null)

  // State management
  const [agents, setAgents] = useState(initialAgents)
  const [open, setOpen] = useState(false)
  const [editAgent, setEditAgent] = useState(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [selectedAgentForCustomers, setSelectedAgentForCustomers] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTerritory, setFilterTerritory] = useState("all")
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" })
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState(null)

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nationalId: "",
    territory: "",
    salesTarget: "",
    commission: "",
    status: "active",
    address: "",
    emergencyContact: "",
    bankAccount: "",
    photo: "/placeholder.svg?height=100&width=100",
  })

  // Handle form operations
  const handleOpen = (agent = null) => {
    if (agent) {
      setEditAgent(agent)
      setFormData({
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        nationalId: agent.nationalId,
        territory: agent.territory,
        salesTarget: agent.salesTarget.toString(),
        commission: agent.commission.toString(),
        status: agent.status,
        address: agent.address,
        emergencyContact: agent.emergencyContact,
        bankAccount: agent.bankAccount,
        photo: agent.photo,
      })
    } else {
      setEditAgent(null)
      setFormData({
        name: "",
        email: "",
        phone: "",
        nationalId: "",
        territory: "",
        salesTarget: "",
        commission: "",
        status: "active",
        address: "",
        emergencyContact: "",
        bankAccount: "",
        photo: "/placeholder.svg?height=100&width=100",
      })
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditAgent(null)
  }

  const handleSubmit = () => {
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.nationalId) {
      setNotification({
        open: true,
        message: "Please fill in all required fields",
        severity: "error",
      })
      return
    }

    const newAgent = {
      id: editAgent ? editAgent.id : Date.now(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      nationalId: formData.nationalId,
      territory: formData.territory,
      salesTarget: Number.parseInt(formData.salesTarget) || 0,
      commission: Number.parseInt(formData.commission) || 0,
      status: formData.status,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      bankAccount: formData.bankAccount,
      photo: formData.photo,
      salesAchieved: editAgent ? editAgent.salesAchieved : 0,
      customersAssigned: editAgent ? editAgent.customersAssigned : 0,
      joinDate: editAgent ? editAgent.joinDate : new Date().toISOString().split("T")[0],
      customers: editAgent ? editAgent.customers : [],
    }

    if (editAgent) {
      setAgents(agents.map((agent) => (agent.id === editAgent.id ? newAgent : agent)))
      setNotification({
        open: true,
        message: "Sales agent updated successfully!",
        severity: "success",
      })
    } else {
      setAgents([...agents, newAgent])
      setNotification({
        open: true,
        message: "Sales agent added successfully!",
        severity: "success",
      })
    }

    handleClose()
  }

  const handleDelete = (agent) => {
    setAgentToDelete(agent)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (agentToDelete) {
      setAgents(agents.filter((agent) => agent.id !== agentToDelete.id))
      setNotification({
        open: true,
        message: "Sales agent deleted successfully!",
        severity: "success",
      })
    }
    setDeleteConfirmOpen(false)
    setAgentToDelete(null)
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData({ ...formData, photo: e.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleViewCustomers = (agent) => {
    setSelectedAgentForCustomers(agent)
    setCustomerDialogOpen(true)
  }

  const handleActionMenuOpen = (event, agent) => {
    setActionMenuAnchor(event.currentTarget)
    setSelectedAgent(agent)
  }

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null)
    setSelectedAgent(null)
  }

  // Utility functions
  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const getPerformancePercentage = (achieved, target) => {
    return Math.min((achieved / target) * 100, 100)
  }

  const getStatusColor = (status) => {
    return status === "active" ? "success" : "error"
  }

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return "success"
    if (percentage >= 70) return "warning"
    return "error"
  }

  // Filter agents based on search and filters
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.territory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.nationalId.includes(searchTerm)

    const matchesStatus = filterStatus === "all" || agent.status === filterStatus
    const matchesTerritory = filterTerritory === "all" || agent.territory === filterTerritory

    return matchesSearch && matchesStatus && matchesTerritory
  })

  // Calculate summary stats
  const totalAgents = agents.length
  const activeAgents = agents.filter((agent) => agent.status === "active").length
  const totalSalesTarget = agents.reduce((sum, agent) => sum + agent.salesTarget, 0)
  const totalSalesAchieved = agents.reduce((sum, agent) => sum + agent.salesAchieved, 0)
  const overallPerformance = totalSalesTarget > 0 ? (totalSalesAchieved / totalSalesTarget) * 100 : 0

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Sales Agent Admin Panel
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {totalAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Agents
                  </Typography>
                </Box>
                <Person sx={{ fontSize: 40, color: "primary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {activeAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Agents
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    KSH {(totalSalesTarget / 1000000).toFixed(1)}M
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sales Target
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 40, color: "warning.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {overallPerformance.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Performance
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: "info.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Territory</InputLabel>
              <Select value={filterTerritory} label="Territory" onChange={(e) => setFilterTerritory(e.target.value)}>
                <MenuItem value="all">All Territories</MenuItem>
                {territories.map((territory) => (
                  <MenuItem key={territory} value={territory}>
                    {territory}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ height: 56 }}>
              Add Agent
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Agents Table */}
      <Paper sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Agent Details</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Territory</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Customers
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Performance
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Sales Target
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="right">
                  Sales Achieved
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAgents.map((agent) => {
                const performance = getPerformancePercentage(agent.salesAchieved, agent.salesTarget)
                return (
                  <TableRow key={agent.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar src={agent.photo} sx={{ mr: 2, width: 50, height: 50 }} alt={agent.name}>
                          {agent.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {agent.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {agent.nationalId}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Joined: {agent.joinDate}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                          <Email sx={{ fontSize: 14, mr: 0.5 }} />
                          {agent.email}
                        </Typography>
                        <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                          <Phone sx={{ fontSize: 14, mr: 0.5 }} />
                          {agent.phone}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={agent.territory}
                        size="small"
                        sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}
                        icon={<LocationOn sx={{ fontSize: 16 }} />}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Badge badgeContent={agent.customersAssigned} color="primary">
                        <Group />
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ minWidth: 100 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {performance.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={performance}
                          color={getPerformanceColor(performance)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        KSH {formatNumber(agent.salesTarget)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium">
                        KSH {formatNumber(agent.salesAchieved)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={agent.status} size="small" color={getStatusColor(agent.status)} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleActionMenuOpen(e, agent)} sx={{ mr: 1 }}>
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          onClick={() => {
            handleViewCustomers(selectedAgent)
            handleActionMenuClose()
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          View Customers
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleOpen(selectedAgent)
            handleActionMenuClose()
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit Agent
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleDelete(selectedAgent)
            handleActionMenuClose()
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          Delete Agent
        </MenuItem>
      </Menu>

      {/* Add/Edit Agent Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">{editAgent ? "Edit Sales Agent" : "Add New Sales Agent"}</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Photo Upload Section */}
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: "center" }}>
                <Avatar src={formData.photo} sx={{ width: 120, height: 120, mx: "auto", mb: 2 }} alt="Agent Photo">
                  {formData.name.charAt(0)}
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <Button
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  onClick={() => fileInputRef.current?.click()}
                  fullWidth
                >
                  Upload Photo
                </Button>
              </Box>
            </Grid>

            {/* Form Fields */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Full Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="National ID *"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email Address *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Territory *</InputLabel>
                    <Select
                      value={formData.territory}
                      label="Territory *"
                      onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                      required
                    >
                      {territories.map((territory) => (
                        <MenuItem key={territory} value={territory}>
                          {territory}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Sales Target (KSH)"
                    type="number"
                    value={formData.salesTarget}
                    onChange={(e) => setFormData({ ...formData, salesTarget: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Commission (%)"
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Bank Account"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={<Save />}>
            {editAgent ? "Update Agent" : "Add Agent"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer List Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6">
              Customers of {selectedAgentForCustomers?.name} ({selectedAgentForCustomers?.customers?.length || 0}{" "}
              customers)
            </Typography>
            <IconButton onClick={() => setCustomerDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAgentForCustomers && selectedAgentForCustomers.customers.length > 0 ? (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Customer Details</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Contact Information</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Date Onboarded</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Last Order</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                      Order Value
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Total Orders
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }} align="center">
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAgentForCustomers.customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>{customer.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {customer.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.company}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                            <Email sx={{ fontSize: 14, mr: 0.5 }} />
                            {customer.email}
                          </Typography>
                          <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                            <Phone sx={{ fontSize: 14, mr: 0.5 }} />
                            {customer.phone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                          <CalendarToday sx={{ fontSize: 14, mr: 0.5 }} />
                          {customer.dateOnboarded}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{customer.lastOrder}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="medium" color="success.main">
                          KSH {formatNumber(customer.orderValue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Badge badgeContent={customer.totalOrders} color="primary">
                          <Assignment />
                        </Badge>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={customer.status}
                          size="small"
                          color={customer.status === "Active" ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Group sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No customers assigned to this agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This agent hasn't onboarded any customers yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<PersonAdd />}>
            Add Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete agent "{agentToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add agent"
        sx={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={() => handleOpen()}
      >
        <Add />
      </Fab>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
