import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { NoteCard } from "@/components/note-card"
import { TagFilter } from "@/components/search/tag-filter"
import { Search } from "lucide-react"

export default async function NotesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string, tags?: string }> 
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  
  const { q, tags: tagsParam } = await searchParams

  let whereClause: any = {
    userId: session.user.id,
    isArchived: false,
  }

  if (q) {
    const result = await db.$queryRaw<{id: string}[]>`
      SELECT id FROM "Note" 
      WHERE "userId" = ${session.user.id} 
      AND "isArchived" = false 
      AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${q})
    `;
    whereClause.id = { in: result.map(r => r.id) };
  }

  if (tagsParam) {
    const tagsArray = tagsParam.split(",").filter(Boolean)
    if (tagsArray.length > 0) {
      whereClause.noteTags = {
        some: {
          tag: {
            name: { in: tagsArray }
          }
        }
      }
    }
  }

  const notes = await db.note.findMany({
    where: whereClause,
    include: {
      noteTags: {
        include: { tag: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  // Fetch available tags for the filter (only those with active notes)
  const tags = await db.tag.findMany({
    where: { 
      userId: session.user.id,
      noteTags: {
        some: {
          note: {
            isArchived: false
          }
        }
      }
    },
    select: { name: true }
  })
  
  const availableTags = tags.map(t => t.name)

  return (
    <div className="w-full h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Notes</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} • Press <kbd className="border rounded px-1.5 py-0.5 bg-muted text-xs font-mono">Cmd/Ctrl + K</kbd> to search globally
          </p>
        </div>
      </div>

      <TagFilter availableTags={availableTags} />

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl bg-muted/20 border-dashed">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No notes found</h2>
          <p className="text-muted-foreground max-w-sm">
            {q || tagsParam 
              ? "We couldn't find any notes matching your current search or filters."
              : "You haven't created any notes yet. Click 'New Note' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
