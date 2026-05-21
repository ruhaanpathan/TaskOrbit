import { db } from "@/lib/db"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { NoteEditor } from "@/components/editor/note-editor"

export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user?.id) redirect("/login")

  const note = await db.note.findUnique({
    where: {
      id: id,
      userId: session.user.id
    },
    include: {
      noteTags: {
        include: {
          tag: true
        }
      },
      aiLogs: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    }
  })

  if (!note) redirect("/notes")

  return (
    <div className="h-full">
      <NoteEditor note={note} userId={session.user.id} />
    </div>
  )
}
