import { useState } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Container,
  Paper,
  Grid,
  InputAdornment,
  FormLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { Email, Check } from "@mui/icons-material"

const RegistrationForm = () => {
  const navigate = useNavigate()

  // Form state
  const [formData, setFormData] = useState({
    registrationType: "self", // 'self' or 'agent'
    salesAgent: "Vijay Kumar",
    companyName: "",
    contactPerson: "",
    email: "",
    phoneNumber: "",
    cashbackPhone: "",
    kraPin: "",
    buildingName: "",
    floorNumber: "",
    roomNumber: "",
    streetName: "",
    areaName: "Westlands (KE)",
    city: "",
    country: "Kenya",
    userType: "Individual", // Changed default to 'Individual' instead of 'Company'
  })

  // Errors state
  const [errors, setErrors] = useState({})

  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  })

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()

    // Basic validation
    const newErrors = {}
    if (!formData.companyName) {
      newErrors.companyName =
        formData.userType === "Individual" ? "Individual name is required" : "Company name is required"
    }
    if (!formData.email) newErrors.email = "Email is required"
    if (!formData.phoneNumber) newErrors.phoneNumber = "Phone number is required"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Show success dialog
    setSuccessDialogOpen(true)

    // In a real app, you would submit the form data to your backend here
    console.log("Form submitted:", formData)
  }

  // Handle dialog close and redirect
  const handleDialogClose = () => {
    setSuccessDialogOpen(false)

    // Show snackbar notification
    setSnackbar({
      open: true,
      message: "Registration successful! Check your email for login instructions.",
      severity: "success",
    })

    // In a real app, you would redirect to login page after a short delay
    setTimeout(() => {
      navigate("/login")
    }, 2000)
  }

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    })
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
          Create New Customer
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Registration Type Section */}
          <Box mb={3}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Registration Type</FormLabel>
              <RadioGroup row name="registrationType" value={formData.registrationType} onChange={handleChange}>
                <FormControlLabel value="self" control={<Radio />} label="Self Registration" />
                <FormControlLabel value="agent" control={<Radio />} label="Registered by Sales Agent" />
              </RadioGroup>
            </FormControl>

            {formData.registrationType === "agent" && (
              <FormControl fullWidth margin="normal" size="small">
                <Typography variant="body2" gutterBottom>
                  Sales Agent
                </Typography>
                <Select name="salesAgent" value={formData.salesAgent} onChange={handleChange}>
                  <MenuItem value="Vijay Kumar">Mike joseph</MenuItem>
                  <MenuItem value="John Doe">John Doe</MenuItem>
                  <MenuItem value="Jane Smith">Jane Smith</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          {/* User Type */}
          <Box mb={3}>
            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Type of User
            </Typography>
            <FormControl fullWidth margin="normal" size="small">
              <RadioGroup row name="userType" value={formData.userType} onChange={handleChange}>
                <FormControlLabel value="Individual" control={<Radio />} label="Individual" />
                <FormControlLabel value="Company" control={<Radio />} label="Company" />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Account Information */}
          <Box mb={3}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              {formData.userType === "Individual" ? "Individual Name" : "Company Name"}{" "}
              <Typography component="span" color="error" variant="body2">
                (Please note: Your invoice will be generated in this name)
              </Typography>
            </Typography>
            <TextField
              fullWidth
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder={formData.userType === "Individual" ? "Individual Name" : "Company Name"}
              size="small"
              error={!!errors.companyName}
              helperText={errors.companyName}
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Contact Person Name
            </Typography>
            <TextField
              fullWidth
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Contact Person Name"
              size="small"
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Email
            </Typography>
            <TextField
              fullWidth
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter Email"
              size="small"
              type="email"
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
            />

             <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Password
            </Typography>
            <TextField
              fullWidth
              name="Password"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter Password"
              size="small"
              type="email"
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Phone Number
            </Typography>
            <TextField
              fullWidth
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="XXXXXXXXX"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 0 }}>
                    +254
                  </InputAdornment>
                ),
              }}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber}
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Cashback Phone Number{" "}
              <Typography component="span" color="error" variant="body2">
                (SAFARICOM MOBILE NUMBER ONLY)
              </Typography>
            </Typography>
            <TextField
              fullWidth
              name="cashbackPhone"
              value={formData.cashbackPhone}
              onChange={handleChange}
              placeholder="XXXXXXXXX"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 0 }}>
                    +254
                  </InputAdornment>
                ),
              }}
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              {formData.userType === "Individual" ? "Individual" : "Company"} KRA Pin{" "}
              <Typography component="span" color="error" variant="body2">
                (Fill this field to claim VAT)
              </Typography>
            </Typography>
            <TextField
              fullWidth
              name="kraPin"
              value={formData.kraPin}
              onChange={handleChange}
              placeholder="KRA pin"
              size="small"
              margin="normal"
            />
          </Box>

          {/* Address Information */}
          <Box mb={3}>
            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Building Name
            </Typography>
            <TextField
              fullWidth
              name="buildingName"
              value={formData.buildingName}
              onChange={handleChange}
              placeholder="Building name"
              size="small"
              margin="normal"
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  Floor Number
                </Typography>
                <TextField
                  fullWidth
                  name="floorNumber"
                  value={formData.floorNumber}
                  onChange={handleChange}
                  placeholder="Floor Number"
                  size="small"
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  Room/Door Number
                </Typography>
                <TextField
                  fullWidth
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  placeholder="Room/Door Number"
                  size="small"
                  margin="normal"
                />
              </Grid>
            </Grid>

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Street Name
            </Typography>
            <TextField
              fullWidth
              name="streetName"
              value={formData.streetName}
              onChange={handleChange}
              placeholder="Street 1"
              size="small"
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Area Name
            </Typography>
            <FormControl fullWidth margin="normal" size="small">
              <Select name="areaName" value={formData.areaName} onChange={handleChange}>
                <MenuItem value="Westlands (KE)">Westlands (KE)</MenuItem>
                <MenuItem value="Nairobi CBD">Parklands</MenuItem>
                <MenuItem value="Kilimani"></MenuItem>
                <MenuItem value="Lavington"></MenuItem>
              </Select>
            </FormControl>

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              City
            </Typography>
            <TextField
              fullWidth
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              size="small"
              margin="normal"
            />

            <Typography variant="body1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Country
            </Typography>
            <TextField
              fullWidth
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Kenya"
              size="small"
              margin="normal"
              disabled
            />
          </Box>

          {/* Information Alert */}
          <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
            <Typography variant="body2">
              Upon registration, a confirmation email will be sent to your email address with login instructions. Your
              temporary password will be "0000" which you'll be prompted to change on first login.
            </Typography>
          </Alert>

          {/* Form Actions */}
          <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4, py: 1 }}>
              Create Customer
            </Button>
            <Button type="button" variant="outlined" onClick={() => navigate(-1)} sx={{ px: 4, py: 1 }}>
              Cancel
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onClose={handleDialogClose} aria-labelledby="registration-success-dialog">
        <DialogTitle id="registration-success-dialog">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Check color="success" />
            Registration Successful
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Thank you for registering with FirstCraft! Your account has been created successfully.
          </DialogContentText>
          <Box sx={{ display: "flex", alignItems: "center", mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Email sx={{ mr: 2, color: "primary.main" }} />
            <DialogContentText>
              A confirmation email has been sent to <strong>{formData.email}</strong> with your login details. Your
              temporary password is <strong>0000</strong>. You will be prompted to change it on your first login.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary" variant="contained" autoFocus>
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} message={snackbar.message} />
    </Container>
  )
}

export default RegistrationForm
