import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Send email function
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter()

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info.messageId)
    return info
  } catch (error) {
    console.error("Email sending failed:", error)
    throw error
  }
}

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Welcome to FirstCraft!</h2>
      <p>Dear ${user.first_name},</p>
      <p>Thank you for joining FirstCraft. Your account has been created successfully.</p>
      <p>You can now start exploring our products and services.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The FirstCraft Team</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: "Welcome to FirstCraft!",
    html,
  })
}

// Send order confirmation email
export const sendOrderConfirmationEmail = async (user, order) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Order Confirmation</h2>
      <p>Dear ${user.first_name},</p>
      <p>Thank you for your order! Here are the details:</p>
      <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Total Amount:</strong> KES ${order.total_amount}</p>
        <p><strong>Status:</strong> ${order.order_status}</p>
      </div>
      <p>We'll notify you when your order is ready for delivery.</p>
      <p>Best regards,<br>The FirstCraft Team</p>
    </div>
  `

  await sendEmail({
    email: user.email,
    subject: `Order Confirmation - ${order.order_number}`,
    html,
  })
}
