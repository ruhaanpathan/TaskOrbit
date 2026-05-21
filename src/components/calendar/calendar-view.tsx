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
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, FileText, CalendarDays, List, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type NoteData = {
  id: string
  title: string
  updatedAt: Date
  noteTags: { tag: { id: string; name: string } }[]
}

type ViewMode = "grid" | "agenda"

export function CalendarView({ initialNotes }: { initialNotes: NoteData[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const notesByDate = initialNotes.reduce((acc, note) => {
    const dateStr = format(new Date(note.updatedAt), "yyyy-MM-dd")
    if (!acc[dateStr]) acc[dateStr] = []
    acc[dateStr].push(note)
    return acc
  }, {} as Record<string, NoteData[]>)

  const agendaDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter((day) => {
    const dateStr = format(day, "yyyy-MM-dd")
    return (notesByDate[dateStr] || []).length > 0
  })

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const selectedNotes = selectedDateStr ? notesByDate[selectedDateStr] || [] : []

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd")
    const hasNotes = (notesByDate[dateStr] || []).length > 0
    if (!hasNotes) return
    setSelectedDate((prev) =>
      prev && format(prev, "yyyy-MM-dd") === dateStr ? null : day
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base sm:text-xl font-bold min-w-[130px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setCurrentDate(new Date()); setSelectedDate(null) }}>
            Today
          </Button>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => { setViewMode("grid"); setSelectedDate(null) }}
              title="Grid view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 transition-colors ${viewMode === "agenda" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => { setViewMode("agenda"); setSelectedDate(null) }}
              title="Agenda view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── GRID VIEW ─── */}
      {viewMode === "grid" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto w-full flex-1">
            <div className="min-w-[560px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
                {weekDays.map((day) => (
                  <div key={day} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 auto-rows-fr bg-border/50 gap-[1px]">
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd")
                  const dayNotes = notesByDate[dateStr] || []
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isTodayDate = isToday(day)
                  const isSelected = selectedDateStr === dateStr
                  const hasNotes = dayNotes.length > 0

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={`min-h-[80px] sm:min-h-[110px] p-1.5 sm:p-2 bg-background transition-colors
                        ${!isCurrentMonth ? "text-muted-foreground bg-muted/5" : "text-foreground"}
                        ${hasNotes ? "cursor-pointer hover:bg-primary/5" : ""}
                        ${isSelected ? "ring-2 ring-inset ring-primary bg-primary/5" : ""}
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors ${
                          isTodayDate ? "bg-primary text-primary-foreground" : isSelected ? "bg-primary/20 text-primary font-bold" : ""
                        }`}>
                          {format(day, "d")}
                        </span>
                        {hasNotes && (
                          <Badge variant="secondary" className="text-[9px] px-1 h-4 hidden sm:flex">
                            {dayNotes.length}
                          </Badge>
                        )}
                      </div>

                      {/* Mobile: dots */}
                      {hasNotes && (
                        <div className="flex flex-wrap gap-1 sm:hidden mt-1">
                          {dayNotes.slice(0, 3).map((note) => (
                            <span key={note.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary" : "bg-primary/50"}`} />
                          ))}
                          {dayNotes.length > 3 && (
                            <span className="text-[9px] text-muted-foreground">+{dayNotes.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Desktop: full cards */}
                      {hasNotes && (
                        <div className="hidden sm:flex flex-col gap-1 overflow-y-auto max-h-[70px]">
                          {dayNotes.map((note) => (
                            <Link key={note.id} href={`/notes/${note.id}`} className="block group" onClick={(e) => e.stopPropagation()}>
                              <div className="text-xs p-1.5 rounded bg-muted/50 border border-transparent group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors truncate">
                                <div className="flex items-center gap-1.5 font-medium truncate text-foreground group-hover:text-primary">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{note.title}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── Selected Day Panel (slides up on mobile, appears below grid on desktop) ─── */}
          {selectedDate && selectedNotes.length > 0 && (
            <div className="border-t border-border bg-card animate-in slide-in-from-bottom-2 duration-200">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedNotes.length} note{selectedNotes.length > 1 ? "s" : ""} updated
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Note list */}
              <div className="flex flex-col gap-2 p-4 max-h-[260px] overflow-y-auto">
                {selectedNotes.map((note) => (
                  <Link key={note.id} href={`/notes/${note.id}`} className="block group">
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {note.title || "Untitled Note"}
                        </p>
                        {note.noteTags.length > 0 && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {note.noteTags.slice(0, 3).map(({ tag }) => (
                              <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 h-4">
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── AGENDA VIEW ─── */}
      {viewMode === "agenda" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          {agendaDays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <CalendarDays className="w-10 h-10 opacity-30" />
              <p className="text-sm">No notes updated this month.</p>
            </div>
          ) : (
            agendaDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const dayNotes = notesByDate[dateStr] || []
              const isTodayDate = isToday(day)

              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl text-center shrink-0 ${
                      isTodayDate ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      <span className="text-[10px] font-semibold leading-none uppercase">
                        {format(day, "EEE")}
                      </span>
                      <span className="text-base font-bold leading-tight">
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">
                      {dayNotes.length} note{dayNotes.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pl-13">
                    {dayNotes.map((note) => (
                      <Link key={note.id} href={`/notes/${note.id}`} className="block group">
                        <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {note.title || "Untitled Note"}
                            </p>
                            {note.noteTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {note.noteTags.slice(0, 3).map(({ tag }) => (
                                  <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 h-4">
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                            {format(new Date(note.updatedAt), "h:mm a")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
