import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Wand2, Archive, Tag as TagIcon, FileText, ChevronRight, CheckSquare, Sparkles, CheckCircle2, Clock, ArrowRight, Video } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { WeeklyActivityChart } from "@/components/dashboard/weekly-activity-chart"
import { PendingTasksList, type PendingTask } from "@/components/dashboard/pending-tasks-list"
import { UpcomingMeetingsList } from "@/components/dashboard/upcoming-meetings-list"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  
  const userId = session.user.id

  // 1. totalNotes
  const totalNotes = await db.note.count({ where: { userId, isArchived: false } })
  
  // 2. archivedNotes
  const archivedNotes = await db.note.count({ where: { userId, isArchived: true } })
  
  // 3. totalAiUsage
  const totalAiUsage = await db.aiLog.count({ where: { note: { userId } } })
  
  // 4. topTags (excluding archived notes)
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

  // 5. weeklyActivity
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

  // 6. recentNotes
  const recentNotes = await db.note.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: { noteTags: { include: { tag: true } } }
  })

  const mostUsedTag = topTags.length > 0 ? topTags[0].name : "None"

  // 7. global pending tasks
  const allActiveNotes = await db.note.findMany({
    where: { userId, isArchived: false },
    include: {
      aiLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  const rawPendingTasks: PendingTask[] = []
  
  allActiveNotes.forEach(note => {
    // Temporary store for manual tasks to check for duplicates
    const allManualTasksForThisNote: string[] = []

    // 1. Manual Note Checklists (Tiptap HTML) - Primary Source of Truth
    if (note.content) {
      
      const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
      let match;
      while ((match = regex.exec(note.content)) !== null) {
        const attributes = match[1];
        if (attributes.includes('data-type="taskItem"')) {
          let rawText = match[2].replace(/<[^>]*>/g, '').trim();
          if (rawText) {
            allManualTasksForThisNote.push(rawText);
            
            // Only add to dashboard pending tasks if it's unchecked
            if (attributes.includes('data-checked="false"')) {
              rawPendingTasks.push({ type: 'manual', noteId: note.id, noteTitle: note.title, text: rawText });
            }
          }
        }
      }
    }

    // Smart Deduplication Helper
    const isDuplicate = (aiText: string, manualTasks: string[]) => {
      const getWords = (text: string) => new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 3))
      const aiWords = getWords(aiText)
      
      for (const manualTask of manualTasks) {
        const manualWords = getWords(manualTask)
        if (aiWords.size === 0 || manualWords.size === 0) {
          if (aiText.toLowerCase().includes(manualTask.toLowerCase()) || manualTask.toLowerCase().includes(aiText.toLowerCase())) return true
          continue
        }
        
        let overlap = 0
        for (const w of aiWords) {
          if (manualWords.has(w)) overlap++
        }
        
        const minWords = Math.min(aiWords.size, manualWords.size)
        // If > 40% of words overlap, consider it a duplicate!
        if ((overlap / minWords) > 0.4) return true
      }
      return false
    }

    // 2. AI Generated Action Items - Only add if not a duplicate
    if (note.aiLogs.length > 0) {
      const latestLog = note.aiLogs[0]
      try {
        const items = typeof latestLog.actionItems === 'string' ? JSON.parse(latestLog.actionItems) : []
        items.forEach((item: any, i: number) => {
          const isCompleted = typeof item === 'object' ? item.completed : false
          const text = typeof item === 'object' ? item.text : item
          
          if (!isCompleted && text) {
            // Check if this AI task is essentially a duplicate of ANY manual checklist item (checked or unchecked)
            if (!isDuplicate(text, allManualTasksForThisNote)) {
              rawPendingTasks.push({ 
                type: 'ai', 
                noteId: note.id, 
                noteTitle: note.title, 
                text,
                logId: latestLog.id,
                taskIndex: i
              })
            }
          }
        })
      } catch (e) {}
    }
  })

  // Separate tasks and meetings
  const pendingTasks: PendingTask[] = []
  const upcomingMeetings: PendingTask[] = []

  rawPendingTasks.forEach(task => {
    const textLower = task.text.toLowerCase()
    if (textLower.includes('meet') || textLower.includes('call') || textLower.includes('zoom') || textLower.includes('sync')) {
      upcomingMeetings.push(task)
    } else {
      pendingTasks.push(task)
    }
  })

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Welcome back! Here's a summary of your workspace activity.
        </p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-primary">Pending Tasks</CardTitle>
            <CheckSquare className="w-4 h-4 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{pendingTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400">Meetings</CardTitle>
            <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{upcomingMeetings.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Notes</CardTitle>
            <BookOpen className="w-4 h-4 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalNotes}</div>
          </CardContent>
        </Card>



        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Top Tag</CardTitle>
            <TagIcon className="w-4 h-4 text-primary opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold truncate tracking-tight">{mostUsedTag}</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Pending Tasks and Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Action Items */}
        <Card className="shadow-sm border-primary/10 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              Global Action Items
            </CardTitle>
            <CardDescription>Your pending tasks across all active notes</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto bg-background">
            <PendingTasksList initialTasks={pendingTasks} />
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card className="shadow-sm border-blue-500/10 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-blue-500/5 border-b border-blue-500/10 shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Video className="w-5 h-5" />
              Upcoming Meetings
            </CardTitle>
            <CardDescription>Action items categorized as meetings or calls</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto bg-background">
            <UpcomingMeetingsList initialTasks={upcomingMeetings} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Charts and Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Weekly Activity (60%) */}
        <Card className="lg:col-span-3 shadow-sm border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Weekly Activity</CardTitle>
            <CardDescription>Notes updated over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <WeeklyActivityChart data={weeklyActivity} />
          </CardContent>
        </Card>

        {/* Top Tags (40%) */}
        <Card className="lg:col-span-2 shadow-sm border-primary/10 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Tags</CardTitle>
            <CardDescription>Your most frequently used tags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 flex-1 flex flex-col justify-center">
            {topTags.length === 0 ? (
              <div className="text-sm text-muted-foreground italic text-center w-full">
                No tags used yet.
              </div>
            ) : (
              topTags.map((tag) => {
                const percentage = Math.max(5, Math.round((tag.count / maxTagCount) * 100))
                return (
                  <div key={tag.name} className="space-y-2 group">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5 group-hover:text-primary transition-colors">
                        <TagIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        {tag.name}
                      </span>
                      <span className="text-muted-foreground font-medium">{tag.count}</span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Notes */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm border-primary/10 overflow-hidden flex flex-col max-h-[400px]">
          <CardHeader className="bg-muted/20 border-b shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Recent Notes
            </CardTitle>
            <CardDescription>Your 5 most recently updated notes</CardDescription>
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
