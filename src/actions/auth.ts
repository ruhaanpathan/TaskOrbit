"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function signupUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "User already exists" }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.user.create({
    data: { name, email, passwordHash },
  })

  return { success: true }
}
