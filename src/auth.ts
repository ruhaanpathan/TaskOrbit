import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { authConfig } from "./auth.config"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "peblo-notes-auth-secret-key-2026",
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }
          
          const cleanEmail = (credentials.email as string).trim().toLowerCase()
          const password = credentials.password as string
          
          const user = await db.user.findUnique({
            where: { email: cleanEmail }
          })
          
          if (!user || !user.passwordHash) {
            return null
          }
          
          const isValid = await bcrypt.compare(
            password, 
            user.passwordHash
          )
          
          if (!isValid) {
            return null
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch (error) {
          console.error("Auth authorize error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const cleanEmail = user.email.trim().toLowerCase()
          let existingUser = await db.user.findUnique({
            where: { email: cleanEmail }
          })

          if (!existingUser) {
            existingUser = await db.user.create({
              data: {
                email: cleanEmail,
                name: user.name || "Google User",
                emailVerified: new Date(),
              }
            })
          }
          user.id = existingUser.id
        } catch (e) {
          console.error("Error creating Google user:", e)
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email.trim().toLowerCase() }
        })
        if (dbUser) {
          token.id = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  session: {
    strategy: "jwt"
  }
})
