"use client"

import { useState, useEffect } from "react"
import {
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"


function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState("customer")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Check URL parameters for user type
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search)
    const typeParam = urlParams.get("type")
    if (typeParam === "agent") {
      setUserType("agent")
    }
  }, [location])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    // Simple validation
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    // For demo purposes, allow any email with password "0000"
    if (password === "0000") {
      // Create mock user data based on user type and email
      const isAdmin = email.toLowerCase().includes("admin")

      const userData = {
        username: email.split("@")[0], // Use part before @ as username
        email: email,
        id: "12345",
        userType: userType,
        isAdmin: isAdmin, // Add admin flag
      }

      // Show success message
      setSuccessMessage(`${userType === "agent" ? "Sales Agent" : "Customer"} login successful! Redirecting...`)

      // Store in localStorage
      localStorage.setItem("currentUser", JSON.stringify(userData))

      // Call the onLogin callback if provided
      if (onLogin) {
        onLogin(userData)
      }

      // Navigate based on user type and admin status
      setTimeout(() => {
        if (isAdmin) {
          navigate("/admin")
        } else if (userType === "agent") {
          navigate("/sales-agent")
        } else {
          navigate("/account")
        }
      }, 1500)
    } else {
      setError("Invalid password. For demo, use '0000' as the password.")
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ padding: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography variant="h5" gutterBottom>
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          {/* User Type Selection */}
          <FormControl component="fieldset" sx={{ width: "100%", mb: 2 }}>
            <FormLabel component="legend">Login as:</FormLabel>
            <RadioGroup
              row
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              sx={{ justifyContent: "center" }}
            >
              <FormControlLabel value="customer" control={<Radio />} label="Customer" />
              <FormControlLabel value="agent" control={<Radio />} label="Sales Agent" />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ mb: 2 }} />

          <TextField
            label="Email Address"
            fullWidth
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Password"
            fullWidth
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Demo Instructions:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              • For Customer: Use any email and password "0000"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • For Admin: Use email containing "admin" (e.g., admin@test.com) and password "0000"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • For Sales Agent: Select "Sales Agent" and use any email with password "0000"
            </Typography>
          </Box>

          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ marginTop: 2, py: 1.5 }}>
            Sign In as {userType === "agent" ? "Sales Agent" : "Customer"}
          </Button>
        </form>
      </Paper>
    </Container>
  )
}

export default LoginPage
