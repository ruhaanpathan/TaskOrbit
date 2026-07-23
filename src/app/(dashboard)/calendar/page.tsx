import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { CalendarView } from "@/components/calendar/calendar-view"

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  const userId = session.user.id

  // Fetch all active notes
  const notes = await db.note.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: {
      noteTags: {
        include: { tag: true }
      }
    }
  })

  // We can pass the raw notes to a client component for interactive month navigation
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Navigate your notes by the date they were last updated.
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <CalendarView initialNotes={notes} />
      </div>
    </div>
  )
}
