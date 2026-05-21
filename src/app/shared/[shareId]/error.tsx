"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function SharedNoteError() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="bg-card border shadow-sm rounded-2xl p-10 max-w-md text-center">
        <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">
          We couldn't load this public note due to an unexpected error.
        </p>
        <Link href="/">
          <Button className="w-full">Return to TaskOrbit</Button>
        </Link>
      </div>
    </div>
  )
}
