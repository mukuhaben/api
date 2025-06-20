// src/pages/RegistrationForm.jsx
import { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Container,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Email, Check } from "@mui/icons-material";

// 👉 Change to your backend URL or keep Vite env variable
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const RegistrationForm = () => {
  const navigate = useNavigate();

  // --- Form State (Individual only) ---
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    cashbackPhone: "",
    contactPerson: "",
    kraPin: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // --- Handle input changes ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // --- Basic client‑side validation ---
  const validate = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = "First name is required";
    if (!formData.last_name) newErrors.last_name = "Last name is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.cashbackPhone) newErrors.cashbackPhone = "Cashback phone is required";
    return newErrors;
  };

  // --- Submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`http://localhost:3000/api/auth/register`, {
        ...formData,
        phone: formData.phone || null,
        contactPerson: formData.contactPerson || null,
        kraPin: formData.kraPin || null,
      });
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "Registration failed";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // --- Dialog close ---
  const handleDialogClose = () => {
    setSuccessDialogOpen(false);
    setSnackbar({ open: true, message: "Registration successful! Check your email.", severity: "success" });
    setTimeout(() => navigate("/login"), 1500);
  };

  const handleSnackbarClose = () => setSnackbar((p) => ({ ...p, open: false }));

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Create New Customer (Individual)
        </Typography>
        <form onSubmit={handleSubmit}>
          {[
            {
              label: "First Name (Invoice)",
              name: "first_name",
              placeholder: "Enter First Name",
              error: errors.first_name,
            },
            {
              label: "Last Name (Invoice)",
              name: "last_name",
              placeholder: "Enter Last Name",
              error: errors.last_name,
            },
            {
              label: "Username",
              name: "username",
              placeholder: "Choose a username",
              error: errors.username,
            },
            { label: "Email", name: "email", placeholder: "Enter Email", error: errors.email, type: "email" },
            { label: "Password", name: "password", placeholder: "Enter Password", error: errors.password, type: "password" },
            { label: "Phone (optional)", name: "phone", placeholder: "07XXXXXXXX" },
            {
              label: "Cashback Phone (Safaricom)",
              name: "cashbackPhone",
              placeholder: "07XXXXXXXX",
              error: errors.cashbackPhone,
            },
            { label: "Contact Person (optional)", name: "contactPerson", placeholder: "Contact Person" },
            { label: "KRA PIN (optional)", name: "kraPin", placeholder: "A001234567X" },
          ].map(({ label, name, placeholder, error, type = "text" }) => (
            <Box key={name} mb={2}>
              <Typography fontWeight="bold" gutterBottom>
                {label}
              </Typography>
              <TextField
                fullWidth
                size="small"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                type={type}
                error={!!error}
                helperText={error}
              />
            </Box>
          ))}

          {/* Info */}
          <Alert severity="info" sx={{ my: 3 }}>
            After registration, you’ll receive a confirmation email. Your temporary password will be <b>0000</b>.
          </Alert>

          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? "Registering..." : "Create Customer"}
          </Button>
        </form>
      </Paper>

      {/* Success dialog */}
      <Dialog open={successDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Check color="success" /> Registration Successful
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            A confirmation email has been sent to <b>{formData.email}</b>.
          </DialogContentText>
          <Box sx={{ display: "flex", alignItems: "center", mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Email sx={{ mr: 2, color: "primary.main" }} />
            Your temporary password is <b>0000</b>.
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} variant="contained" autoFocus>
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
};

export default RegistrationForm;
