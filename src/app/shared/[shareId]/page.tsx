import { getSharedTaskDetails } from "@/actions/collaboration"
import { SharedNoteTaskClient } from "./shared-note-client"
import { Metadata } from "next"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params
  
  const note = await db.note.findUnique({
    where: { shareId }
  })

  if (!note || !note.isPublic) {
    return {
      title: "Task List Not Found - TaskOrbit",
    }
  }

  return {
    title: `${note.title} - Collaborative Task List - TaskOrbit`,
    description: `Collaborate on "${note.title}" on TaskOrbit.`
  }
}

export default async function SharedNotePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  const data = await getSharedTaskDetails(shareId)

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="bg-card border shadow-sm rounded-2xl p-10 max-w-md text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Task List Unavailable</h1>
          <p className="text-muted-foreground mb-8">
            This task list either doesn't exist, has been deleted, or is no longer shared publicly by its owner.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Return to TaskOrbit</Link>
          </Button>
        </div>
      </div>
    )
  }

  return <SharedNoteTaskClient initialData={data} shareId={shareId} />
}
