"use client"

import { useState } from "react"
import { Sparkles, CheckCircle2, FileText, Loader2, Video, ExternalLink, CalendarPlus } from "lucide-react"
import Link from "next/link"
import { completeTaskGlobal } from "@/lib/actions/dashboard"
import { toast } from "sonner"
import type { PendingTask } from "./pending-tasks-list"

export function UpcomingMeetingsList({ initialTasks }: { initialTasks: PendingTask[] }) {
  const [tasks, setTasks] = useState<PendingTask[]>(initialTasks)
  const [completingIndex, setCompletingIndex] = useState<number | null>(null)

  const handleStartMeeting = async (e: React.MouseEvent, task: PendingTask, index: number) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Open Google Meet in a new tab immediately so the user isn't blocked by DB update
    window.open('https://meet.google.com/new', '_blank')

    // 2. Mark the meeting as completed/started in the database
    setCompletingIndex(index)
    try {
      await completeTaskGlobal(task.type, task.noteId, task.text, task.logId, task.taskIndex)
      setTasks(prev => prev.filter((_, i) => i !== index))
      toast.success("Meeting started and marked as completed!")
    } catch (err) {
      toast.error("Failed to update status, but meeting was launched.")
    } finally {
      setCompletingIndex(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        No upcoming meetings! You're schedule is clear.
      </div>
    )
  }

  const parseTimeForToday = (text: string): Date | null => {
    const absoluteMatch = text.toLowerCase().match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (absoluteMatch) {
      let hours = parseInt(absoluteMatch[1], 10)
      const minutes = absoluteMatch[2] ? parseInt(absoluteMatch[2], 10) : 0
      const ampm = absoluteMatch[3]

      if (ampm === "pm" && hours < 12) hours += 12
      if (ampm === "am" && hours === 12) hours = 0

      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return date
    }
    return null
  }

  return (
    <div className="divide-y divide-border">
      {tasks.map((task, i) => {
        const targetTime = parseTimeForToday(task.text)
        const isDelayed = targetTime ? targetTime.getTime() < new Date().getTime() : false

        let gcalLink = ""
        if (targetTime) {
          const endTime = new Date(targetTime.getTime() + 60 * 60 * 1000) // 1 hour duration
          const formatStr = (d: Date) => d.getFullYear().toString() + (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0') + 'T' + d.getHours().toString().padStart(2, '0') + d.getMinutes().toString().padStart(2, '0') + '00'
          const startStr = formatStr(targetTime)
          const endStr = formatStr(endTime)
          gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.noteTitle + " Meeting")}&details=${encodeURIComponent("Task: " + task.text)}&dates=${startStr}/${endStr}`
        }

        return (
        <div 
          key={`${task.noteId}-${i}`} 
          className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:px-6 hover:bg-muted/50 transition-colors group relative overflow-hidden gap-3 sm:gap-6"
        >
          <div className="flex items-start gap-1 flex-1">
            {/* Start Meeting Button */}
            <button 
              onClick={(e) => handleStartMeeting(e, task, i)}
              disabled={completingIndex === i}
              className="shrink-0 p-2 -ml-2 -mt-1.5 transition-colors group/btn flex items-center justify-center cursor-pointer"
              title="Start Google Meet"
            >
              {completingIndex === i ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className="bg-blue-500/10 p-1.5 rounded-full text-blue-600 dark:text-blue-400 group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-colors">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
              )}
            </button>
            
            {/* Task Text */}
            <div className="flex flex-col">
              <p className={`text-sm font-medium leading-snug transition-all duration-300 ${completingIndex === i ? 'text-muted-foreground line-through' : (isDelayed ? 'text-destructive font-bold' : 'text-foreground')}`}>
                {task.text}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${isDelayed ? 'text-destructive/80' : 'text-blue-600/70'}`}>
                  <ExternalLink className="w-3 h-3" /> {isDelayed ? 'Overdue - Start Immediately!' : 'Click camera icon to start'}
                </div>
                {gcalLink && (
                  <a 
                    href={gcalLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                  >
                    <CalendarPlus className="w-3 h-3" /> Add to GCal
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* RIGHT SIDE: Note Title */}
          <Link 
            href={`/notes/${task.noteId}`}
            className="flex items-center gap-1.5 ml-10 sm:ml-0 text-xs text-muted-foreground hover:text-primary hover:underline transition-colors shrink-0 pt-0.5"
            title={`Open note: ${task.noteTitle}`}
          >
            <FileText className="w-3 h-3" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">
              {task.noteTitle}
            </span>
          </Link>
        </div>
        )
      })}
    </div>
  )
}
