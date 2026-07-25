import nodemailer from "nodemailer"

export async function sendOtpEmail(email: string, code: string, type: "SIGNUP" | "FORGOT_PASSWORD") {
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const resendApiKey = process.env.RESEND_API_KEY

  const subject = type === "SIGNUP" 
    ? `TaskOrbit - Verify Your Email`
    : `TaskOrbit - Reset Your Password`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111; margin: 0;">TaskOrbit</h1>
      </div>
      
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; text-align: center;">
        <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">
          ${type === "SIGNUP" ? "Your email verification code is:" : "Your password reset code is:"}
        </p>
        
        <div style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #111; padding: 16px 0; font-family: monospace;">
          ${code}
        </div>
        
        <p style="font-size: 13px; color: #9ca3af; margin: 16px 0 0;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `

  // Priority 1: Gmail / SMTP (Sends to ANY email address worldwide)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass.trim().replace(/\s+/g, ""), // Remove spaces in App Password
        },
      })

      await transporter.sendMail({
        from: `TaskOrbit <${smtpUser.trim()}>`,
        to: email.trim(),
        subject,
        html,
      })

      console.log(`✅ Real OTP email delivered to ${email} via Gmail SMTP`)
      return { success: true }
    } catch (error: any) {
      console.error("❌ Gmail SMTP Error:", error)
      return { 
        success: false, 
        error: error?.message || "Failed to send email via Gmail SMTP" 
      }
    }
  }

  // Priority 2: Resend API
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: "TaskOrbit <onboarding@resend.dev>",
          to: [email],
          subject,
          html,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.message && data.message.includes("You can only send testing emails to your own email address")) {
          console.log(`\n========================================`)
          console.log(`⚠️ Resend test mode restriction for external email: ${email}`)
          console.log(`📧 [TEST OTP CODE FOR ${email}]: [ ${code} ]`)
          console.log(`========================================\n`)
          return { success: true }
        }

        console.error("❌ Resend API Error:", data)
        return { success: false, error: data.message || "Failed to send email via Resend" }
      }

      console.log(`✅ OTP email successfully sent to ${email} via Resend (ID: ${data.id})`)
      return { success: true }
    } catch (error: any) {
      console.error("❌ Resend Fetch Exception:", error)
      return { success: false, error: error?.message || "Email service error" }
    }
  }

  // Priority 3: Fallback console output
  console.log(`\n========================================`)
  console.log(`⚠️ No SMTP or Resend credentials set in .env!`)
  console.log(`📧 [LOCAL TEST OTP FOR: ${email}]`)
  console.log(`🔑 CODE: [ ${code} ]`)
  console.log(`========================================\n`)

  return { success: true, code }
}
