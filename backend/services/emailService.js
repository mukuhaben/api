const nodemailer = require("nodemailer")

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Send welcome email
const sendWelcomeEmail = async (email, userData) => {
  try {
    const { name, userType, tempPassword } = userData

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Welcome to FirstCraft - Your Account is Ready!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to FirstCraft!</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2>Hello ${name},</h2>
            
            <p>Thank you for registering with FirstCraft! Your ${userType} account has been created successfully.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Your Login Details:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Account Type:</strong> ${userType}</p>
            </div>
            
            <p style="color: #d32f2f;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Complete your profile information</li>
              <li>Browse our extensive product catalog</li>
              <li>Start earning cashback on your purchases</li>
              ${userType === "sales_agent" ? "<li>Begin onboarding customers and earning commissions</li>" : ""}
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The FirstCraft Team</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>FirstCraft - Your Trusted Office Supplies Partner</p>
            <p>Email: info@firstcraft.com | Phone: +254 722 517 263</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Welcome email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    throw error
  }
}

// Send order confirmation email
const sendOrderConfirmationEmail = async (email, orderData) => {
  try {
    const { orderNumber, customerName, items, total, cashback } = orderData

    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.totalPrice.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("")

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center;">
            <h1>Order Confirmed!</h1>
            <p>Order #${orderNumber}</p>
          </div>
          
          <div style="padding: 20px;">
            <h2>Hello ${customerName},</h2>
            
            <p>Thank you for your order! We've received your order and it's being processed.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #e0e0e0;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f0f0f0; font-weight: bold;">
                    <td colspan="2" style="padding: 10px;">Total Amount:</td>
                    <td style="padding: 10px; text-align: right;">KES ${total.toLocaleString()}</td>
                  </tr>
                  ${
                    cashback > 0
                      ? `
                  <tr style="color: #4caf50;">
                    <td colspan="2" style="padding: 10px;">Cashback Earned:</td>
                    <td style="padding: 10px; text-align: right;">KES ${cashback.toLocaleString()}</td>
                  </tr>
                  `
                      : ""
                  }
                </tfoot>
              </table>
            </div>
            
            <p>We'll send you another email when your order ships with tracking information.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" 
                 style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Track Your Order
              </a>
            </div>
            
            <p>Best regards,<br>The FirstCraft Team</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Order confirmation email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send order confirmation email:", error)
    throw error
  }
}

// Send password reset email
const sendPasswordResetEmail = async (email, resetData) => {
  try {
    const { name, resetToken } = resetData
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Password Reset Request - FirstCraft",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Request</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2>Hello ${name},</h2>
            
            <p>We received a request to reset your password for your FirstCraft account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>Best regards,<br>The FirstCraft Team</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Password reset email sent successfully to:", email)
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    throw error
  }
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail,
}
