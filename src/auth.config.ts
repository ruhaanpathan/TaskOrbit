import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/notes")
      
      if (isProtectedRoute) {
        if (isLoggedIn) return true
        return false // Redirect to /login
      }
      return true
    },
  },
  providers: [], // Add providers in auth.ts to avoid edge runtime issues with bcrypt
} satisfies NextAuthConfig
