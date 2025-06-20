import React, { useState, useEffect } from "react"
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Button,
  TextField,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Badge,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material"
import {
  Person,
  Edit,
  ShoppingBag,
  Inbox,
  Settings,
  PhotoCamera,
  Notifications,
  CheckCircle,
  Schedule,
  Delete,
  DeleteForever,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { usersAPI, ordersAPI, authAPI, uploadAPI } from "../../../services/api"

const AccountPage = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()

  // State for active tab
  const [activeTab, setActiveTab] = useState(0)

  // State for user data
  const [userData, setUserData] = useState({
    id: "",
    firstName: "", // from first_name
    lastName: "", // from last_name
    username: "", // from username
    email: "", // from email
    phone: "", // from phone_number
    address: "", // from primary address in addresses array
    profilePicture: null, // from profile_picture_url
    addresses: [], // full addresses array
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  // State for orders data
  const [ordersData, setOrdersData] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState(null)


  // State for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // State for edit mode
  const [editMode, setEditMode] = useState(false)

  // State for profile picture dialog
  const [profilePictureDialog, setProfilePictureDialog] = useState(false)

  // State for remove profile picture confirmation dialog
  const [removeProfileDialog, setRemoveProfileDialog] = useState(false)

  // State for success message
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")


  useEffect(() => {
    const fetchAccountData = async () => {
      setProfileLoading(true)
      setOrdersLoading(true)
      try {
        // Fetch profile
        const profileResponse = await usersAPI.getProfile()
        if (profileResponse.data && profileResponse.data.success) {
          const user = profileResponse.data.data.user
          setUserData({
            id: user.id,
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            username: user.username || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            email: user.email || "",
            phone: user.phone_number || "",
            address: user.addresses && user.addresses.length > 0
              ? [
                  user.addresses[0].street,
                  user.addresses[0].city,
                  user.addresses[0].state_province, // Added state_province as per suggestion, can be removed if not applicable
                  user.addresses[0].postal_code,
                  user.addresses[0].country,
                ].filter(Boolean).join(", ") || "No address details found"
              : "No address provided",
            profilePicture: user.profile_picture_url || null,
            addresses: user.addresses || [],
          })
        } else {
          setProfileError(profileResponse.data?.message || "Failed to load profile.")
        }
      } catch (err) {
        setProfileError(err.response?.data?.message || err.message || "An error occurred while fetching profile.")
      } finally {
        setProfileLoading(false)
      }

      try {
        // Fetch orders
        const ordersResponse = await ordersAPI.getMyOrders() // Add params if needed e.g. { limit: 10, sortBy: 'order_date', sortOrder: 'DESC'}
        if (ordersResponse.data && ordersResponse.data.success) {
           // Sort orders by date (newest first) and assign serial numbers
          const sortedOrders = (ordersResponse.data.data.orders || ordersResponse.data.orders || [])
            .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
            .map((order, index) => ({
              ...order,
              serialNo: index + 1,
            }));
          setOrdersData(sortedOrders)
        } else {
          setOrdersError(ordersResponse.data?.message || "Failed to load orders.")
        }
      } catch (err) {
        setOrdersError(err.response?.data?.message || err.message || "An error occurred while fetching orders.")
      } finally {
        setOrdersLoading(false)
      }
    }

    fetchAccountData()
  }, [])

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  // Handle user data change
  const handleUserDataChange = (e) => {
    const { name, value } = e.target
    setUserData({
      ...userData,
      [name]: value,
    })
  }

  // Handle password data change
  const handlePasswordDataChange = (e) => {
    const { name, value } = e.target
    setPasswordData({
      ...passwordData,
      [name]: value,
    })
  }

  // Handle profile picture change
  const handleProfilePictureChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      try {
        setSuccessMessage("")
        setErrorMessage("")
        const response = await uploadAPI.uploadFile(file, "profile")
        if (response.data && response.data.success) {
          setUserData({
            ...userData,
            profilePicture: response.data.data.file_url,
          })
          setProfilePictureDialog(false)
          setSuccessMessage("Profile picture updated successfully!")
          // Optionally, call handleSaveProfile here if you want to persist the URL immediately
          // await handleSaveProfile(response.data.data.file_url);
        } else {
          setErrorMessage(response.data?.message || "Failed to upload profile picture.")
        }
      } catch (error) {
        setErrorMessage(error.response?.data?.message || error.message || "An error occurred while uploading.")
      } finally {
        setTimeout(() => {
          setSuccessMessage("")
          setErrorMessage("")
        }, 5000)
      }
    }
  }

  // Handle remove profile picture
  const handleRemoveProfilePicture = async () => {
    // TODO: Implement backend call to remove profile picture if API exists.
    // For now, just clearing locally and assuming save profile will handle it.
    setSuccessMessage("")
    setErrorMessage("")
    setUserData({
      ...userData,
      profilePicture: null,
    })
    setRemoveProfileDialog(false)
    // Call save profile to persist null value for profile_picture_url
    try {
        const payload = {
            first_name: userData.firstName,
            last_name: userData.lastName,
            username: userData.username,
            email: userData.email, // Assuming email cannot be changed from here, or backend handles it
            phone_number: userData.phone,
            // addresses: userData.addresses, // Address update might be complex, handle separately if needed
            profile_picture_url: null, // Explicitly setting to null
          };
        const response = await usersAPI.updateProfile(payload);
        if (response.data && response.data.success) {
            setSuccessMessage("Profile picture removed successfully!")
        } else {
            setErrorMessage(response.data?.message || "Failed to update profile on server.");
        }
    } catch (error) {
        setErrorMessage(error.response?.data?.message || error.message || "An error occurred while updating profile.");
    }
     setTimeout(() => {
        setSuccessMessage("")
        setErrorMessage("")
    }, 3000)
  }

  // Handle save profile
  const handleSaveProfile = async (newProfilePictureUrl = undefined) => {
    setSuccessMessage("")
    setErrorMessage("")
    try {
      // Map frontend state to backend expected fields
      const payload = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        username: userData.username,
        email: userData.email, // Assuming email cannot be changed from here, or backend handles it
        phone_number: userData.phone,
        // addresses: userData.addresses, // Address update might be complex, handle separately if needed
      }
      if (newProfilePictureUrl !== undefined) {
        payload.profile_picture_url = newProfilePictureUrl;
      } else if (userData.profilePicture !== undefined) {
        payload.profile_picture_url = userData.profilePicture;
      }


      const response = await usersAPI.updateProfile(payload)
      if (response.data && response.data.success) {
        setEditMode(false)
        setSuccessMessage("Profile updated successfully!")
        // Optionally re-fetch profile to get any server-side transformations
        // const profileResponse = await usersAPI.getProfile(); ... setUserData(...)
      } else {
        setErrorMessage(response.data?.message || "Failed to update profile.")
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || "An error occurred while saving profile.")
    }
    setTimeout(() => {
      setSuccessMessage("")
      setErrorMessage("")
    }, 3000)
  }

  // Handle password change
  const handlePasswordChange = async () => {
    setSuccessMessage("")
    setErrorMessage("")
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage("New passwords do not match!")
      setTimeout(() => setErrorMessage(""), 3000)
      return
    }

    try {
      const response = await authAPI.updatePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        // confirm_password: passwordData.confirmPassword, // usually not needed by backend if new_password is provided
      })
      if (response.data && response.data.success) {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setSuccessMessage("Password changed successfully!")
      } else {
        setErrorMessage(response.data?.message || "Failed to change password.")
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || "An error occurred.")
    }
    setTimeout(() => {
      setSuccessMessage("")
      setErrorMessage("")
    }, 3000)
  }


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1500, minWidth: '300px' }}>
          {successMessage}
        </Alert>
      )}
       {errorMessage && (
        <Alert severity="error" sx={{ mb: 3, position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1500, minWidth: '300px' }}>
          {errorMessage}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, mb: 4 }}>
        {profileLoading ? (
          <Typography>Loading profile...</Typography>
        ) : profileError ? (
          <Alert severity="error">{profileError}</Alert>
        ) : (
        <>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Avatar
            src={userData.profilePicture} // Uses profile_picture_url
            sx={{ width: 80, height: 80, mr: 2, bgcolor: theme.palette.primary.main }}
          >
            {!userData.profilePicture && userData.username && <Person fontSize="large" />}
             {!userData.profilePicture && !userData.username && <Person fontSize="large" />}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              Hello, {userData.username || `${userData.firstName} ${userData.lastName}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome to your account dashboard
            </Typography>
          </Box>
        </Box>
        </>
        )}

        {/* The first Box with Tabs is inside the Paper and conditional rendering, this is CORRECT */}
        {/* The redundant Box with Tabs that was here has been REMOVED. */}

        {/* Profile Tab */}
        {activeTab === 0 && (
          <Box sx={{ py: 3 }}>
          {profileLoading ? (
            <Typography>Loading profile details...</Typography>
          ) : profileError ? (
            <Alert severity="error">{profileError}</Alert>
          ) : (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" component="h2">
                Account Information
              </Typography>
              <Button
                variant="outlined"
                startIcon={editMode ? null : <Edit />}
                onClick={() => setEditMode(!editMode)}
                color={editMode ? "success" : "primary"}
              >
                {editMode ? "Cancel" : "Edit Profile"}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3, position: "relative", textAlign: "center" }}>
                  <Avatar
                    src={userData.profilePicture}
                    sx={{
                      width: 120,
                      height: 120,
                      mx: "auto",
                      mb: 2,
                      bgcolor: theme.palette.primary.main,
                    }}
                  >
                    {!userData.profilePicture && userData.username && <Person fontSize="large" />}
                    {!userData.profilePicture && !userData.username && <Person fontSize="large" />}
                  </Avatar>

                  {/* Profile picture actions */}
                  {editMode && (
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PhotoCamera />}
                        onClick={() => setProfilePictureDialog(true)}
                        size="small"
                      >
                        Change Photo
                      </Button>

                      {userData.profilePicture && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteForever />}
                          onClick={() => setRemoveProfileDialog(true)}
                          size="small"
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleUserDataChange}
                  disabled={!editMode}
                  margin="normal"
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleUserDataChange}
                  disabled={!editMode}
                  margin="normal"
                  variant="outlined"
                />
                 <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={userData.username}
                  onChange={handleUserDataChange}
                  disabled={!editMode} // Username might not be editable or editable with restrictions
                  margin="normal"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleUserDataChange}
                  disabled // Email is typically not editable directly by user
                  margin="normal"
                  variant="outlined"
                  InputProps={{ readOnly: true }}
                  helperText="Email cannot be changed."
                />

                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={userData.phone}
                  onChange={handleUserDataChange}
                  disabled={!editMode}
                  margin="normal"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Address" // Displaying the first address for simplicity
                  name="address"
                  value={userData.address} // This should be derived from addresses array or a specific primary_address field
                  onChange={handleUserDataChange} // Handling complex address updates needs more specific UI
                  disabled={!editMode} // Or make a dedicated address management section
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={3}
                  helperText="Primary address shown. For more address options, go to address book (if available)."
                />

                {editMode && (
                  <Button variant="contained" color="primary" onClick={() => handleSaveProfile()} sx={{ mt: 2 }} fullWidth>
                    Save Changes
                  </Button>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                {/* This Grid item is for the right column, intended for Change Password */}
                {/* The premature closing tags </> and )} will be moved after this section */}
                <Typography variant="h6" component="h3" gutterBottom>
                  Change Password
                </Typography>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordDataChange}
                  margin="normal"
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordDataChange}
                  margin="normal"
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordDataChange}
                  margin="normal"
                  variant="outlined"
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePasswordChange}
                  sx={{ mt: 2 }}
                  fullWidth
                  disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  Update Password
                </Button>
              </Grid> {/* End of Right Column (Change Password) */}
            </Grid> {/* End of Main Grid container for Profile Tab */}
          </>
          )} {/* End of conditional rendering (profileLoading/profileError) */}
          </Box>
        )}

        {/* Orders Tab */}
        {activeTab === 1 && (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              My Orders
            </Typography>
            {ordersLoading ? (
              <Typography>Loading orders...</Typography>
            ) : ordersError ? (
              <Alert severity="error">{ordersError}</Alert>
            ) : ordersData.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                      <TableCell>Serial No.</TableCell>
                      <TableCell>Order No.</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell> {/* Display items instead of single product */}
                      <TableCell align="right">Total Paid</TableCell>
                      <TableCell align="center">Cashback</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">ETIMS INV NO.</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordersData.map((order) => { // Use ordersData
                      return (
                        <TableRow key={order.id || order.serialNo} hover> {/* Use order.id from backend */}
                          <TableCell>{order.serialNo}</TableCell>
                          <TableCell>
                            <Button
                              variant="text"
                              color="primary"
                              onClick={() => navigate(`/order-details/${order.order_number || order.id}`)} // Use order_number or id
                              sx={{ textTransform: "none", padding: 0, minWidth: "auto" }}
                            >
                              {order.order_number || order.id}
                            </Button>
                          </TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {order.items && order.items.length > 0 ? (
                              <ul style={{paddingLeft: 15, margin: 0}}>
                                {order.items.slice(0, 2).map((item, index) => ( // Corrected: Added index parameter
                                  <li key={item.product_id || item.id}>
                                    {item.product_name} (Qty: {item.quantity})
                                    {order.items.length > 2 && index === 1 && "..."}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell align="right">{order.total_amount}/=</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${order.cashback_amount || 0}/=`} // Use cashback_amount
                              color="success"
                              size="small"
                              sx={{ fontSize: "0.7rem", height: "20px" }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={order.status}
                              color={order.status === "COMPLETED" ? "success" : (order.status === "PENDING" ? "warning" : "default")}
                              size="small"
                              icon={order.status === "COMPLETED" ? <CheckCircle /> : <Schedule />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {order.etims_invoice_number || ( // Use etims_invoice_number
                              <Chip
                                label="Pending"
                                size="small"
                                color="default"
                                sx={{ fontSize: "0.7rem", height: "20px" }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate(`/order-details/${order.order_number || order.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <ShoppingBag sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Orders Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  You haven't placed any orders yet. Start shopping to see your orders here.
                </Typography>
                <Button variant="contained" color="primary" onClick={() => navigate("/")} sx={{ mt: 2 }}>
                  Browse Products
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Inbox Tab */}
        {activeTab === 2 && (
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" component="h2">
                My Inbox
              </Typography>
               <Notifications />
            </Box>
            <Box sx={{ textAlign: "center", py: 4 }}>
                <Inbox sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Inbox Feature Not Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is currently under development. Please check back later.
                </Typography>
              </Box>
          </Box>
        )}

        {/* Settings Tab */}
        {activeTab === 3 && (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Account Settings
            </Typography>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body1">Email Notifications</Typography>
                      <Button variant="outlined" size="small">
                        Manage
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Receive notifications about orders, promotions, and account updates via email.
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Privacy Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body1">Data Sharing</Typography>
                      <Button variant="outlined" size="small">
                        Manage
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Control how your data is used and shared with third parties.
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  Danger Zone
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body1">Delete Account</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Permanently delete your account and all associated data.
                    </Typography>
                  </Box>
                  <Button variant="outlined" color="error" startIcon={<Delete />}>
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>

      {/* Profile Picture Upload Dialog */}
      <Dialog open={profilePictureDialog} onClose={() => setProfilePictureDialog(false)}>
        <DialogTitle>Change Profile Picture</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a new profile picture. The image should be at least 200x200 pixels.
          </Typography>
          <Button variant="contained" component="label" startIcon={<PhotoCamera />} fullWidth>
            Choose File
            <input type="file" hidden accept="image/*" onChange={handleProfilePictureChange} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfilePictureDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Remove Profile Picture Confirmation Dialog */}
      <Dialog open={removeProfileDialog} onClose={() => setRemoveProfileDialog(false)}>
        <DialogTitle>Remove Profile Picture</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to remove your profile picture?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveProfileDialog(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemoveProfilePicture}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default AccountPage
