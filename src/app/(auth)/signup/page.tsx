"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleButton } from "@/components/auth/google-button"
import { requestSignupOtp, completeSignupOtp } from "@/actions/auth"
import { toast } from "sonner"
import { Mail, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<"DETAILS" | "OTP">("DETAILS")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setDevCode(null)

    try {
      const res = await requestSignupOtp({ name, email, password })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Verification code sent to ${res.email}`)
        if (res.codeForDev) {
          setDevCode(res.codeForDev)
        }
        setStep("OTP")
      }
    } catch (error) {
      toast.error("Failed to send verification code")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Complete Signup with OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await completeSignupOtp({ name, email, password, code: otpCode })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Email verified! Signing you in...")
        
        // Auto Sign In
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        })

        if (signInRes?.error) {
          toast.error("Error signing in. Please log in manually.")
          router.push("/login")
        } else {
          router.push("/dashboard")
          router.refresh()
        }
      }
    } catch (error) {
      toast.error("An error occurred during verification")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-primary/10">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold tracking-tight text-center">
          {step === "DETAILS" ? "Create an account" : "Verify Email"}
        </CardTitle>
        <CardDescription className="text-center">
          {step === "DETAILS" 
            ? "Get started with your TaskOrbit workspace" 
            : `Enter the 6-digit verification code sent to ${email}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {step === "DETAILS" ? (
          <>
            {/* Google OAuth Sign In */}
            <GoogleButton text="Continue with Google" />

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-border w-full" />
              <span className="bg-card px-3 text-xs text-muted-foreground uppercase font-semibold relative shrink-0">
                or sign up with email
              </span>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="At least 8 characters" 
                  minLength={8} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Mail className="w-4 h-4" />
                {loading ? "Sending OTP..." : "Verify Email & Continue"}
              </Button>
            </form>
          </>
        ) : (
          /* Step 2: OTP Entry */
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in">
            {devCode && (
              <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg text-xs font-mono text-center">
                🔑 Demo OTP Code: <strong className="text-sm select-all">{devCode}</strong>
              </div>
            )}

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
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading || otpCode.length < 6}>
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Verifying..." : "Complete Registration"}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full gap-2 text-xs text-muted-foreground"
              onClick={() => setStep("DETAILS")}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to details
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
