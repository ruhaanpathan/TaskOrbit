import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { NoteCard } from "@/components/note-card"
import { Archive } from "lucide-react"
import { EmptyArchiveButton } from "./empty-archive-button"

export default async function ArchivePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  
  const notes = await db.note.findMany({
    where: {
      userId: session.user.id,
      isArchived: true,
    },
    include: {
      noteTags: {
        include: { tag: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Archive className="w-8 h-8 text-muted-foreground" />
          Archive
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Your archived notes. They are hidden from your dashboard but can be restored at any time.
        </p>
      </div>
      
      <div className="flex justify-end">
        <EmptyArchiveButton hasNotes={notes.length > 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card/30">
            No archived notes found.
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))
        )}
      </div>
    </div>
  )
}
