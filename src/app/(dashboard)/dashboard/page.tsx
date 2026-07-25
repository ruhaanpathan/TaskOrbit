import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Tag as TagIcon, FileText, CheckSquare, Users, Video } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { WeeklyActivityChart } from "@/components/dashboard/weekly-activity-chart"
import { PendingTasksList, type PendingTask } from "@/components/dashboard/pending-tasks-list"
import { SharedTeamTasksDashboardList, type SharedDashboardTask } from "@/components/dashboard/shared-team-tasks-list"
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  
  const userId = session.user.id

  // 1. totalNotes
  const totalNotes = await db.note.count({ where: { userId, isArchived: false } })
  
  // 2. topTags (excluding archived notes)
  const topTags = await db.$queryRaw<{ name: string, count: number }[]>`
    SELECT t.name, CAST(COUNT(nt."noteId") AS INTEGER) as count 
    FROM "Tag" t 
    JOIN "NoteTag" nt ON t.id = nt."tagId"
    JOIN "Note" n ON nt."noteId" = n.id
    WHERE t."userId" = ${userId} AND n."isArchived" = false
    GROUP BY t.name 
    ORDER BY count DESC 
    LIMIT 5
  `
  const maxTagCount = topTags.length > 0 ? topTags[0].count : 1

  // 3. weeklyActivity
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const notesInLast7Days = await db.note.findMany({
    where: {
      userId,
      updatedAt: { gte: sevenDaysAgo }
    },
    select: { updatedAt: true }
  })

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklyActivityMap = new Map<string, number>()

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStr = days[d.getDay()]
    if (!weeklyActivityMap.has(dayStr)) {
      weeklyActivityMap.set(dayStr, 0)
    }
  }

  notesInLast7Days.forEach(note => {
    const dayStr = days[note.updatedAt.getDay()]
    if (weeklyActivityMap.has(dayStr)) {
      weeklyActivityMap.set(dayStr, weeklyActivityMap.get(dayStr)! + 1)
    }
  })

  const weeklyActivity = Array.from(weeklyActivityMap.entries()).map(([day, count]) => ({
    day,
    count
  }))

  // 4. recentNotes
  const recentNotes = await db.note.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: { noteTags: { include: { tag: true } } }
  })

  // 5. Personal (Private) Notes
  const personalNotes = await db.note.findMany({
    where: { userId, isArchived: false, isPublic: false },
    include: {
      aiLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  })

  // 6. Shared (Team) Notes (Owned + Joined)
  const sharedOwnedNotes = await db.note.findMany({
    where: { userId, isArchived: false, isPublic: true },
    include: {
      user: { select: { name: true, email: true } },
      companyWorkspace: true,
      checkItems: true,
      aiLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  })

  const joinedCollaboratorNotes = await db.taskCollaborator.findMany({
    where: { userId },
    include: {
      note: {
        include: {
          user: { select: { name: true, email: true } },
          companyWorkspace: true,
          checkItems: true,
          aiLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      }
    }
  })

  // Extract Personal Tasks
  const rawPersonalTasks: PendingTask[] = []
  personalNotes.forEach(note => {
    if (note.content) {
      const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi
      let match
      while ((match = regex.exec(note.content)) !== null) {
        const attributes = match[1]
        if (attributes.includes('data-type="taskItem"') && attributes.includes('data-checked="false"')) {
          let rawText = match[2].replace(/<[^>]*>/g, '').trim()
          if (rawText) {
            rawPersonalTasks.push({ type: 'manual', noteId: note.id, noteTitle: note.title, text: rawText })
          }
        }
      }
    }
  })

  // Extract Shared Team Tasks with Member Completion Attribution
  const rawSharedTasks: SharedDashboardTask[] = []
  const sharedNotesList = [...sharedOwnedNotes, ...joinedCollaboratorNotes.map((c) => c.note)]
  const processedTaskKeys = new Set<string>()

  sharedNotesList.forEach(note => {
    const isOwner = note.userId === userId
    const ownerName = note.user?.name || note.user?.email || "Owner"
    const companyFolderName = note.companyWorkspace?.name

    const checkItemsMap = new Map<string, any>()
    note.checkItems?.forEach((item: any) => {
      checkItemsMap.set(item.taskText.trim(), item)
    })

    if (note.content) {
      const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi
      let match
      while ((match = regex.exec(note.content)) !== null) {
        const attributes = match[1]
        if (attributes.includes('data-type="taskItem"')) {
          let rawText = match[2].replace(/<[^>]*>/g, '').trim()
          if (!rawText) continue

          const taskKey = `${note.id}-${rawText}`
          if (processedTaskKeys.has(taskKey)) continue
          processedTaskKeys.add(taskKey)

          const checkItem = checkItemsMap.get(rawText)
          const isDocChecked = attributes.includes('data-checked="true"')

          // If doc is checked AND no pending review item, task is fully completed
          if (isDocChecked && (!checkItem || checkItem.status === "APPROVED")) {
            continue
          }

          // If member checked it or doc is unchecked:
          if (checkItem && checkItem.status !== "APPROVED") {
            rawSharedTasks.push({
              noteId: note.id,
              shareId: note.shareId || note.id,
              noteTitle: note.title,
              text: rawText,
              checkItemId: checkItem.id,
              completedByName: checkItem.completedByName,
              completedAt: checkItem.completedAt,
              isCompletedByMember: true,
              isOwner,
              ownerName,
              companyFolderName
            })
          } else if (!isDocChecked) {
            rawSharedTasks.push({
              noteId: note.id,
              shareId: note.shareId || note.id,
              noteTitle: note.title,
              text: rawText,
              isCompletedByMember: false,
              isOwner,
              ownerName,
              companyFolderName
            })
          }
        }
      }
    }
  })

  // Separate meetings
  const personalTasks: PendingTask[] = []
  const sharedTasks: SharedDashboardTask[] = []
  const upcomingMeetings: PendingTask[] = []

  rawPersonalTasks.forEach(task => {
    const textLower = task.text.toLowerCase()
    if (textLower.includes('meet') || textLower.includes('call') || textLower.includes('zoom') || textLower.includes('sync')) {
      upcomingMeetings.push(task)
    } else {
      personalTasks.push(task)
    }
  })

  rawSharedTasks.forEach(task => {
    const textLower = task.text.toLowerCase()
    if (textLower.includes('meet') || textLower.includes('call') || textLower.includes('zoom') || textLower.includes('sync')) {
      upcomingMeetings.push({ 
        type: 'manual', 
        noteId: task.noteId, 
        noteTitle: task.noteTitle, 
        text: task.text,
        ownerName: task.ownerName,
        companyFolderName: task.companyFolderName
      })
    } else {
      sharedTasks.push(task)
    }
  })

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-medium text-sm">
          Welcome back! Here's a summary of your personal & shared team tasks.
        </p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm bg-card border border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Tasks</CardTitle>
            <CheckSquare className="w-4 h-4 text-foreground opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{personalTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-card border border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shared Team Tasks</CardTitle>
            <Users className="w-4 h-4 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-primary">{sharedTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-card border border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meetings</CardTitle>
            <Video className="w-4 h-4 text-foreground opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{upcomingMeetings.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-card border border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Notes</CardTitle>
            <BookOpen className="w-4 h-4 text-foreground opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{totalNotes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Strictly Separated Personal vs Shared Team Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Personal Action Items */}
        <Card className="shadow-sm border-border/80 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-foreground" />
              Personal Action Items
            </CardTitle>
            <CardDescription className="text-xs">Tasks from your private personal notes</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto bg-background">
            <PendingTasksList initialTasks={personalTasks} />
          </CardContent>
        </Card>

        {/* Shared Team Tasks */}
        <Card className="shadow-sm border-border/80 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground">
                <Users className="w-4 h-4 text-foreground" />
                Shared Team Tasks
              </span>
              <Link href="/shared-tasks" className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">
                View All →
              </Link>
            </CardTitle>
            <CardDescription className="text-xs">Collaborative tasks distributed with your team</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto bg-background">
            <SharedTeamTasksDashboardList initialTasks={sharedTasks} />
          </CardContent>
        </Card>

      </div>

      {/* Row 3: Upcoming Meetings & Weekly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Meetings */}
        <Card className="shadow-sm border-border/80 overflow-hidden flex flex-col max-h-[350px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Video className="w-4 h-4 text-foreground" />
              Upcoming Meetings
            </CardTitle>
            <CardDescription className="text-xs">Action items categorized as meetings or calls</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto bg-background">
            <UpcomingMeetingsList initialTasks={upcomingMeetings} />
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-bold">Weekly Activity</CardTitle>
            <CardDescription className="text-xs">Notes updated over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <WeeklyActivityChart data={weeklyActivity} />
          </CardContent>
        </Card>

      </div>

      {/* Row 4: Recent Notes */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm border-border/80 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-foreground" />
              Recent Notes
            </CardTitle>
            <CardDescription className="text-xs">Your 5 most recently updated notes</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto">
            <div className="divide-y divide-border">
              {recentNotes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm bg-background">
                  No recent notes found.
                </div>
              ) : (
                recentNotes.map((note) => (
                  <Link 
                    key={note.id} 
                    href={`/notes/${note.id}`}
                    className="flex items-center justify-between p-4 sm:px-6 hover:bg-muted/50 transition-colors group bg-background"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {note.title}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {note.noteTags.length === 0 ? (
                             <span className="text-[10px] text-muted-foreground italic">No tags</span>
                          ) : note.noteTags.map(({ tag }) => (
                            <Badge key={tag.id} variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 mt-3 sm:mt-0 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(note.updatedAt))} ago
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  )
}
