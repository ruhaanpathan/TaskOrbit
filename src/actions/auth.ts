"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function signupUser(formData: FormData) {
  try {
    const name = (formData.get("name") as string)?.trim() || null
    const rawEmail = formData.get("email") as string
    const password = formData.get("password") as string

    if (!rawEmail || !password) {
      return { error: "Email and password are required" }
    }

    const email = rawEmail.trim().toLowerCase()

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long" }
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return { error: "An account with this email already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.user.create({
      data: { name, email, passwordHash },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Signup error:", error)
    return { error: error?.message || "Failed to create account. Please try again." }
  }
}
