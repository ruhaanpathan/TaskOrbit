import React from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 relative">
      <div className="absolute top-8 left-8">
        <Link href="/" className="text-2xl font-bold tracking-tight hover:text-primary transition-colors">
          TaskOrbit
        </Link>
      </div>
      {children}
    </div>
  )
}
