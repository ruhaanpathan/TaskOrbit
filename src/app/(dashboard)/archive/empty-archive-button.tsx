"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { emptyArchive } from "@/lib/actions/notes"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

export function EmptyArchiveButton({ hasNotes }: { hasNotes: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { data: session } = useSession()

  if (!hasNotes) return null

  const handleEmpty = async () => {
    if (!session?.user?.id) return
    
    if (confirm("Are you sure you want to permanently delete all archived notes? This action cannot be undone.")) {
      setIsDeleting(true)
      try {
        await emptyArchive(session.user.id)
        toast.success("Archive emptied successfully")
      } catch (err) {
        toast.error("Failed to empty archive")
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <button
      onClick={handleEmpty}
      disabled={isDeleting}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      Empty Archive
    </button>
  )
}
