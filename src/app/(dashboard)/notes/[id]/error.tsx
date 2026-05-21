"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileWarning } from "lucide-react"
import Link from "next/link"

export default function NoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="bg-card border shadow-sm rounded-2xl p-10 max-w-md text-center">
        <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileWarning className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-3">Could not load note</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          There was an error loading this note. It may have been deleted or you don't have permission to view it.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => reset()}>Try again</Button>
          <Link href="/notes">
            <Button>Go back to Notes</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
