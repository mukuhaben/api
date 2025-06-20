// import nodemailer from "nodemailer"
// import dotenv from "dotenv"

// dotenv.config()

// // Create transporter
// const createTransporter = () => {
//   return nodemailer.createTransporter({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   })
// }

// // Send email function
// export const sendEmail = async (options) => {
//   try {
//     const transporter = createTransporter()

//     const mailOptions = {
//       from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//       to: options.email,
//       subject: options.subject,
//       text: options.message,
//       html: options.html,
//     }

//     const info = await transporter.sendMail(mailOptions)
//     console.log("Email sent successfully:", info.messageId)
//     return info
//   } catch (error) {
//     console.error("Email sending failed:", error)
//     throw error
//   }
// }

// // Send welcome email
// export const sendWelcomeEmail = async (user) => {
//   const html = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//       <h2 style="color: #1976d2;">Welcome to FirstCraft!</h2>
//       <p>Dear ${user.first_name},</p>
//       <p>Thank you for joining FirstCraft. Your account has been created successfully.</p>
//       <p>You can now start exploring our products and services.</p>
//       <p>If you have any questions, feel free to contact our support team.</p>
//       <p>Best regards,<br>The FirstCraft Team</p>
//     </div>
//   `

//   await sendEmail({
//     email: user.email,
//     subject: "Welcome to FirstCraft!",
//     html,
//   })
// }

// // Send order confirmation email
// export const sendOrderConfirmationEmail = async (user, order) => {
//   const html = `
//     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//       <h2 style="color: #1976d2;">Order Confirmation</h2>
//       <p>Dear ${user.first_name},</p>
//       <p>Thank you for your order! Here are the details:</p>
//       <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
//         <p><strong>Order Number:</strong> ${order.order_number}</p>
//         <p><strong>Total Amount:</strong> KES ${order.total_amount}</p>
//         <p><strong>Status:</strong> ${order.order_status}</p>
//       </div>
//       <p>We'll notify you when your order is ready for delivery.</p>
//       <p>Best regards,<br>The FirstCraft Team</p>
//     </div>
//   `

//   await sendEmail({
//     email: user.email,
//     subject: `Order Confirmation - ${order.order_number}`,
//     html,
//   })
// }
// src/utils/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendConfirmationEmail = async (email, token) => {
  const confirmationUrl = `${process.env.FRONTEND_URL}/set-password?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Set Your Password',
    html: `
      <h2>Welcome to FirstCraft!</h2>
      <p>Please set your password by clicking the link below:</p>
      <a href="${confirmationUrl}">Set Your Password</a>
      <p>If you did not register, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  console.log('Sending reset email to:', email, 'with URL:', resetUrl);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${name || 'User'},</p>
      <p>You requested a password reset for your FirstCraft account. Click the link below to set a new password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
      <p>Thank you,<br>FirstCraft Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
