export async function sendOtpEmail(email: string, code: string, type: "SIGNUP" | "FORGOT_PASSWORD") {
  const subject = type === "SIGNUP" 
    ? `TaskOrbit - Your Email Verification Code: ${code}`
    : `TaskOrbit - Reset Password Verification Code: ${code}`

  const message = type === "SIGNUP"
    ? `Welcome to TaskOrbit! Your 6-digit verification code is: ${code}. It expires in 10 minutes.`
    : `Your password reset code for TaskOrbit is: ${code}. It expires in 10 minutes.`

  console.log(`\n========================================`)
  console.log(`📧 [EMAIL SENT TO: ${email}]`)
  console.log(`📌 Subject: ${subject}`)
  console.log(`🔑 OTP CODE: [ ${code} ]`)
  console.log(`========================================\n`)

  return { success: true, code }
}
