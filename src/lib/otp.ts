import { db } from "@/lib/db"

export async function generateOtpToken(email: string, type: "SIGNUP" | "FORGOT_PASSWORD") {
  const cleanEmail = email.trim().toLowerCase()
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Delete any previous tokens for this email & type
  await db.otpToken.deleteMany({
    where: { email: cleanEmail, type }
  })

  // Create new token
  await db.otpToken.create({
    data: {
      email: cleanEmail,
      code,
      type,
      expiresAt
    }
  })

  return code
}

export async function verifyOtpToken(email: string, code: string, type: "SIGNUP" | "FORGOT_PASSWORD") {
  const cleanEmail = email.trim().toLowerCase()
  const cleanCode = code.trim()

  const token = await db.otpToken.findFirst({
    where: {
      email: cleanEmail,
      code: cleanCode,
      type,
      expiresAt: { gte: new Date() }
    }
  })

  if (!token) {
    return { success: false, error: "Invalid or expired OTP code" }
  }

  // Clean up token after verification
  await db.otpToken.delete({
    where: { id: token.id }
  })

  return { success: true }
}
