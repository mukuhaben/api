"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { ArrowBack, ArrowForward, CheckCircle, LocalShipping, Payment, Receipt } from "@mui/icons-material"

// Helper function to format numbers with commas
const formatNumberWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const steps = ["Shipping Information", "Payment Method", "Order Confirmation"]

export default function Checkout() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const [activeStep, setActiveStep] = useState(0)
  const [cartItems, setCartItems] = useState([])
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")

  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Uganda",
  })

  const [paymentMethod, setPaymentMethod] = useState("mpesa")
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Load cart items
  useEffect(() => {
    const storedCartItems = JSON.parse(localStorage.getItem("cartItems")) || []
    if (storedCartItems.length === 0) {
      navigate("/cart")
      return
    }
    setCartItems(storedCartItems)
  }, [navigate])

  // Calculate totals
  const VAT_RATE = 0.16
  const subtotalExclVAT = cartItems.reduce((sum, item) => {
    const quantity = item.quantity || 1
    const price = item.price || 0
    const priceExclVAT = Math.round(price / (1 + VAT_RATE))
    return sum + priceExclVAT * quantity
  }, 0)

  const vatAmount = Math.round(subtotalExclVAT * VAT_RATE)
  const total = subtotalExclVAT + vatAmount
  const shippingCost = 15000 // Fixed shipping cost

  const totalCashback = cartItems.reduce((sum, item) => {
    const quantity = item.quantity || 1
    const cashbackPercent = item.cashbackPercent || 5
    const price = item.price || 0
    const priceExclVAT = Math.round(price / (1 + VAT_RATE))
    return sum + Math.round((priceExclVAT * quantity * cashbackPercent) / 100)
  }, 0)

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate shipping information
      const requiredFields = ["firstName", "lastName", "email", "phone", "address", "city"]
      const isValid = requiredFields.every((field) => shippingInfo[field].trim() !== "")
      if (!isValid) {
        alert("Please fill in all required fields")
        return
      }
    }

    if (activeStep === 1) {
      // Validate payment method
      if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
        alert("Please enter your M-Pesa phone number")
        return
      }
      if (!termsAccepted) {
        alert("Please accept the terms and conditions")
        return
      }
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }

  const handlePlaceOrder = () => {
    // Generate order number
    const orderNum = `FCL${Date.now().toString().slice(-6)}`
    setOrderNumber(orderNum)
    setOrderComplete(true)

    // Clear cart
    localStorage.removeItem("cartItems")

    // Add cashback to wallet (simulate)
    const currentWallet = JSON.parse(localStorage.getItem("walletBalance")) || 0
    localStorage.setItem("walletBalance", JSON.stringify(currentWallet + totalCashback))
  }

  if (orderComplete) {
    return (
      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 }, textAlign: "center" }}>
        <CheckCircle sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Order Confirmed!
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Order Number: {orderNumber}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Thank you for your purchase! Your order has been successfully placed.
        </Typography>
        <Typography variant="body2" color="success.main" sx={{ mb: 4 }}>
          Cashback of {formatNumberWithCommas(totalCashback)}/= has been added to your wallet.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate("/")} sx={{ mr: 2, textTransform: "none" }}>
          Continue Shopping
        </Button>
        <Button variant="outlined" color="primary" onClick={() => navigate("/account")} sx={{ textTransform: "none" }}>
          View Orders
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Checkout
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel
              StepIconComponent={({ active, completed }) => {
                const icons = [LocalShipping, Payment, Receipt]
                const Icon = icons[index]
                return (
                  <Icon
                    sx={{
                      color: completed ? "success.main" : active ? "primary.main" : "text.disabled",
                    }}
                  />
                )
              }}
            >
              {!isMobile && label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {activeStep === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Shipping Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    value={shippingInfo.firstName}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    value={shippingInfo.lastName}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number *"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address *"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="City *"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {activeStep === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Payment Method
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <FormControlLabel value="mpesa" control={<Radio />} label="M-Pesa Mobile Money" />
                  <FormControlLabel value="card" control={<Radio />} label="Credit/Debit Card" disabled />
                  <FormControlLabel value="bank" control={<Radio />} label="Bank Transfer" disabled />
                </RadioGroup>
              </FormControl>

              {paymentMethod === "mpesa" && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="M-Pesa Phone Number"
                    placeholder="256XXXXXXXXX"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Alert severity="info">
                    You will receive an M-Pesa prompt on your phone to complete the payment.
                  </Alert>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />}
                  label="I accept the terms and conditions and privacy policy"
                />
              </Box>
            </Paper>
          )}

          {activeStep === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Confirmation
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Please review your order details before placing the order.
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Shipping Information:
                </Typography>
                <Typography variant="body2">
                  {shippingInfo.firstName} {shippingInfo.lastName}
                </Typography>
                <Typography variant="body2">{shippingInfo.email}</Typography>
                <Typography variant="body2">{shippingInfo.phone}</Typography>
                <Typography variant="body2">
                  {shippingInfo.address}, {shippingInfo.city}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Payment Method:
                </Typography>
                <Typography variant="body2">
                  {paymentMethod === "mpesa" ? `M-Pesa (${mpesaPhone})` : paymentMethod}
                </Typography>
              </Box>
            </Paper>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button onClick={() => navigate("/cart")} startIcon={<ArrowBack />} sx={{ textTransform: "none" }}>
              Back to Cart
            </Button>
            <Box>
              {activeStep > 0 && (
                <Button onClick={handleBack} sx={{ mr: 1, textTransform: "none" }}>
                  Back
                </Button>
              )}
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  sx={{ textTransform: "none" }}
                >
                  Next
                </Button>
              ) : (
                <Button variant="contained" color="success" onClick={handlePlaceOrder} sx={{ textTransform: "none" }}>
                  Place Order
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: "sticky", top: 20 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Order Summary
            </Typography>

            {cartItems.map((item) => (
              <Box key={item.id} sx={{ display: "flex", mb: 2 }}>
                <Box
                  component="img"
                  src={item.image}
                  alt={item.name}
                  sx={{ width: 50, height: 50, objectFit: "contain", mr: 2 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Qty: {item.quantity || 1}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {formatNumberWithCommas(item.price * (item.quantity || 1))}/=
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>Subtotal (Excl. VAT):</Typography>
              <Typography>{formatNumberWithCommas(subtotalExclVAT)}/=</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>Shipping:</Typography>
              <Typography>{formatNumberWithCommas(shippingCost)}/=</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>VAT (16%):</Typography>
              <Typography>{formatNumberWithCommas(vatAmount)}/=</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography color="success.main">Cashback:</Typography>
              <Typography color="success.main">-{formatNumberWithCommas(totalCashback)}/=</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6" fontWeight="bold">
                Total:
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatNumberWithCommas(total + shippingCost)}/=
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
