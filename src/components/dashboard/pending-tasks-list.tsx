"use client"

import { useState } from "react"
import { Sparkles, CheckCircle2, FileText, Loader2, CalendarPlus } from "lucide-react"
import Link from "next/link"
import { completeTaskGlobal } from "@/lib/actions/dashboard"
import { toast } from "sonner"

export type PendingTask = {
  type: 'ai' | 'manual';
  noteId: string;
  noteTitle: string;
  text: string;
  logId?: string;
  taskIndex?: number;
}

export function PendingTasksList({ initialTasks }: { initialTasks: PendingTask[] }) {
  const [tasks, setTasks] = useState<PendingTask[]>(initialTasks)
  const [completingIndex, setCompletingIndex] = useState<number | null>(null)

  const handleComplete = async (e: React.MouseEvent, task: PendingTask, index: number) => {
    // Prevent the Link click from triggering navigation
    e.preventDefault()
    e.stopPropagation()

    setCompletingIndex(index)

    try {
      await completeTaskGlobal(task.type, task.noteId, task.text, task.logId, task.taskIndex)
      
      // Optimistically remove from list
      setTasks(prev => prev.filter((_, i) => i !== index))
      toast.success("Task completed!")
    } catch (err) {
      toast.error("Failed to complete task")
    } finally {
      setCompletingIndex(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        You have no pending action items! You're all caught up.
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
          gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Task: " + task.noteTitle)}&details=${encodeURIComponent(task.text)}&dates=${startStr}/${endStr}`
        }

        return (
        <div 
          key={`${task.noteId}-${i}`} 
          className="flex flex-col sm:flex-row sm:items-start justify-between p-4 sm:px-6 hover:bg-muted/50 transition-colors group relative overflow-hidden gap-3 sm:gap-6"
        >
          <div className="flex items-start gap-1 flex-1">
            {/* LEFT SIDE: Big hit-area Checkbox */}
            <button 
              onClick={(e) => handleComplete(e, task, i)}
              disabled={completingIndex === i}
              className="shrink-0 p-2 -ml-2 -mt-1.5 transition-colors group/btn flex items-center justify-center cursor-pointer"
              title="Mark as completed"
            >
              {completingIndex === i ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              ) : task.type === 'ai' ? (
                <div className="relative flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary opacity-80" />
                  <div className="absolute inset-0 bg-background opacity-0 group-hover/btn:opacity-100 flex items-center justify-center transition-opacity rounded-sm">
                    <div className="w-4 h-4 border-2 border-primary/40 rounded-sm group-hover/btn:border-primary transition-colors" />
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                  <div className="absolute inset-0 bg-background opacity-0 group-hover/btn:opacity-100 flex items-center justify-center transition-opacity rounded-sm">
                    <div className="w-4 h-4 border-2 border-primary/40 rounded-sm group-hover/btn:border-primary transition-colors" />
                  </div>
                </div>
              )}
            </button>
            
            {/* Task Text */}
            <div className="flex flex-col">
              <p className={`text-sm font-medium leading-snug transition-all duration-300 ${completingIndex === i ? 'text-muted-foreground line-through' : (isDelayed ? 'text-destructive font-bold' : 'text-foreground')}`}>
                {task.text}
                {isDelayed && <span className="ml-2 text-[10px] uppercase tracking-wider text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Overdue</span>}
              </p>
              {gcalLink && (
                <div className="mt-1.5 flex">
                  <a 
                    href={gcalLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors z-10"
                  >
                    <CalendarPlus className="w-3 h-3" /> Add to GCal
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {/* RIGHT SIDE: Note Title */}
          <Link href={`/notes/${task.noteId}`} className="flex items-center gap-1.5 ml-7 sm:ml-0 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0 pt-0.5 z-10">
            <FileText className="w-3 h-3" />
            <span className="truncate max-w-[180px] sm:max-w-[200px]">
              {task.noteTitle}
            </span>
          </Link>
        </div>
        )
      })}
    </div>
  )
}
