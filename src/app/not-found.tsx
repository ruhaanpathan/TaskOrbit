import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page Not Found — TaskOrbit",
  description: "The page you are looking for does not exist.",
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="bg-card border shadow-sm rounded-2xl p-10 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-muted-foreground" />
        </div>

        <p className="text-6xl font-black text-foreground/10 mb-2 select-none">404</p>

        <h1 className="text-2xl font-bold mb-3 text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Head back to your workspace to continue.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/notes">My Notes</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          TaskOrbit — Your AI-powered workspace
        </p>
      </div>
    </div>
  )
}
