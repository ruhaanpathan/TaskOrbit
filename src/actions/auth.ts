"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { generateOtpToken, verifyOtpToken } from "@/lib/otp"
import { sendOtpEmail } from "@/lib/mail"

// Step 1 Signup: Request OTP
export async function requestSignupOtp(data: { name?: string; email: string; password: string }) {
  const cleanEmail = data.email.trim().toLowerCase()
  
  if (!cleanEmail || !data.password) {
    return { error: "Email and password are required" }
  }

  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  const existingUser = await db.user.findUnique({ where: { email: cleanEmail } })
  if (existingUser) {
    return { error: "An account with this email already exists" }
  }

  // Generate OTP & Send Email
  const code = await generateOtpToken(cleanEmail, "SIGNUP")
  await sendOtpEmail(cleanEmail, code, "SIGNUP")

  return { success: true, email: cleanEmail, codeForDev: code }
}

// Step 2 Signup: Verify OTP and create user
export async function completeSignupOtp(data: { name?: string; email: string; password: string; code: string }) {
  const cleanEmail = data.email.trim().toLowerCase()

  const otpCheck = await verifyOtpToken(cleanEmail, data.code, "SIGNUP")
  if (!otpCheck.success) {
    return { error: otpCheck.error || "Invalid OTP code" }
  }

  const passwordHash = await bcrypt.hash(data.password, 12)
  await db.user.create({
    data: {
      name: data.name || null,
      email: cleanEmail,
      passwordHash,
      emailVerified: new Date()
    }
  })

  return { success: true }
}

// Step 1 Forgot Password: Request OTP
export async function requestForgotPasswordOtp(email: string) {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) {
    return { error: "Email address is required" }
  }

  const existingUser = await db.user.findUnique({ where: { email: cleanEmail } })
  if (!existingUser) {
    return { error: "No account found with this email address" }
  }

  const code = await generateOtpToken(cleanEmail, "FORGOT_PASSWORD")
  await sendOtpEmail(cleanEmail, code, "FORGOT_PASSWORD")

  return { success: true, email: cleanEmail, codeForDev: code }
}

// Step 2 Forgot Password: Verify OTP
export async function verifyForgotPasswordOtp(email: string, code: string) {
  const cleanEmail = email.trim().toLowerCase()
  const otpCheck = await verifyOtpToken(cleanEmail, code, "FORGOT_PASSWORD")
  
  if (!otpCheck.success) {
    return { error: otpCheck.error || "Invalid or expired OTP code" }
  }

  return { success: true }
}

// Step 3 Forgot Password: Reset Password
export async function resetUserPassword(data: { email: string; newPassword: string }) {
  const cleanEmail = data.email.trim().toLowerCase()
  if (!data.newPassword || data.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters long" }
  }

  const existingUser = await db.user.findUnique({ where: { email: cleanEmail } })
  if (!existingUser) {
    return { error: "User account not found" }
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 12)
  await db.user.update({
    where: { email: cleanEmail },
    data: { passwordHash }
  })

  return { success: true }
}
