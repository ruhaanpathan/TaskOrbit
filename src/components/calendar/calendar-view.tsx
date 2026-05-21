"use client"

import { useState } from "react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek
} from "date-fns"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type NoteData = {
  id: string
  title: string
  updatedAt: Date
  noteTags: { tag: { id: string, name: string } }[]
}

export function CalendarView({ initialNotes }: { initialNotes: NoteData[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const dateFormat = "MMMM yyyy"
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Group notes by date string (YYYY-MM-DD)
  const notesByDate = initialNotes.reduce((acc, note) => {
    const dateStr = format(new Date(note.updatedAt), "yyyy-MM-dd")
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(note)
    return acc
  }, {} as Record<string, NoteData[]>)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
        <h2 className="text-xl font-bold">{format(currentDate, dateFormat)}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Horizontally scrollable container for mobile */}
      <div className="overflow-x-auto w-full">
        <div className="min-w-[700px]">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
            {weekDays.map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-border/50 gap-[1px]">
            {days.map((day, idx) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const dayNotes = notesByDate[dateStr] || []
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isTodayDate = isToday(day)

              return (
                <div 
                  key={day.toString()} 
                  className={`min-h-[120px] sm:min-h-[140px] p-2 bg-background transition-colors hover:bg-muted/10 ${
                    !isCurrentMonth ? "text-muted-foreground bg-muted/5" : "text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                      isTodayDate ? "bg-primary text-primary-foreground" : ""
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayNotes.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                        {dayNotes.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[80px] sm:max-h-[100px] no-scrollbar">
                    {dayNotes.map((note) => (
                      <Link 
                        key={note.id} 
                        href={`/notes/${note.id}`}
                        className="block group"
                      >
                        <div className="text-xs p-1.5 rounded bg-muted/50 border border-transparent group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors truncate">
                          <div className="flex items-center gap-1.5 font-medium truncate text-foreground group-hover:text-primary">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">{note.title}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
