"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { requestForgotPasswordOtp, verifyForgotPasswordOtp, resetUserPassword } from "@/actions/auth"
import { toast } from "sonner"
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<"EMAIL" | "OTP" | "NEW_PASSWORD">("EMAIL")
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await requestForgotPasswordOtp(email)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Verification code sent to ${res.email}`)
        setStep("OTP")
      }
    } catch (error) {
      toast.error("Failed to request password reset")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await verifyForgotPasswordOtp(email, otpCode)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Code verified! Set your new password.")
        setStep("NEW_PASSWORD")
      }
    } catch (error) {
      toast.error("Failed to verify code")
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await resetUserPassword({ email, newPassword })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Password reset successfully! Please sign in.")
        router.push("/login")
      }
    } catch (error) {
      toast.error("Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-primary/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold tracking-tight text-center">
          {step === "EMAIL" && "Reset Password"}
          {step === "OTP" && "Verify OTP Code"}
          {step === "NEW_PASSWORD" && "Set New Password"}
        </CardTitle>
        <CardDescription className="text-center">
          {step === "EMAIL" && "Enter your registered email to receive a verification code"}
          {step === "OTP" && `Enter the 6-digit code sent to ${email}`}
          {step === "NEW_PASSWORD" && "Create a new password for your account"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Step 1: Email */}
        {step === "EMAIL" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Registered Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Mail className="w-4 h-4" />
              {loading ? "Sending Code..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Entry */}
        {step === "OTP" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
            <div className="space-y-2">
              <Label htmlFor="otpCode">6-Digit Verification Code</Label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input 
                  id="otpCode" 
                  placeholder="123456" 
                  maxLength={6} 
                  className="pl-9 font-mono text-center tracking-widest text-lg font-bold"
                  value={otpCode} 
                  onChange={(e) => setOtpCode(e.target.value)} 
                  required 
                />
              </div>
              <p className="text-xs text-muted-foreground">Check your email inbox (and spam folder) for the code.</p>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading || otpCode.length < 6}>
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Verifying..." : "Verify Code"}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full gap-2 text-xs text-muted-foreground"
              onClick={() => { setStep("EMAIL"); setOtpCode("") }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change email
            </Button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "NEW_PASSWORD" && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input id="newPassword" type="password" placeholder="At least 8 characters" minLength={8} className="pl-9" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Repeat new password" minLength={8} className="pl-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading || newPassword.length < 8}>
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Updating Password..." : "Update Password & Sign In"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
