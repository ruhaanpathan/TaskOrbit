"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, X, Clock, Trash2, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface CustomReminder {
  id: string
  label: string    // human-readable description
  fireAt: number   // unix ms
}

const STORAGE_KEY = "taskorbit_custom_reminders"

const PRESETS = [
  { label: "5 min",  minutes: 5  },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
]

// ---------- Chime ----------
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + i * 0.55
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, t)
      osc.frequency.setValueAtTime(1046.5, t + 0.1)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
      gain.gain.linearRampToValueAtTime(0, t + 0.3)
      osc.start(t); osc.stop(t + 0.4)
    }
  } catch (e) { /* silent fail */ }
}

// ---------- Storage ----------
function loadReminders(): CustomReminder[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") }
  catch { return [] }
}
function saveReminders(r: CustomReminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
}

// ---------- Natural Language Parser ----------
// Returns { fireAt, description } or null if no time found
function parseNaturalLanguage(input: string): { fireAt: number; description: string } | null {
  const text = input.trim()
  const lower = text.toLowerCase()
  let fireAt: number | null = null
  let matchedStr = ""

  // ── Relative: "in X min(s)" / "in X hour(s)"
  const relMatch = lower.match(/\bin\s+(\d+)\s*(min(?:utes?)?|hr|hours?)\b/)
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10)
    const unit = relMatch[2]
    const ms = unit.startsWith("min") ? amount * 60000 : amount * 3600000
    fireAt = Date.now() + ms
    matchedStr = relMatch[0]
  }

  // ── Absolute: "at 2pm", "at 14:00", "at 2:30 pm"
  if (!fireAt) {
    const absMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (absMatch) {
      let hours = parseInt(absMatch[1], 10)
      const mins = absMatch[2] ? parseInt(absMatch[2], 10) : 0
      const ampm = absMatch[3]
      if (ampm === "pm" && hours < 12) hours += 12
      if (ampm === "am" && hours === 12) hours = 0
      const d = new Date()
      d.setHours(hours, mins, 0, 0)
      // If the time is already past today, schedule for tomorrow
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
      fireAt = d.getTime()
      matchedStr = absMatch[0]
    }
  }

  if (!fireAt) return null

  // Build description: strip time phrase + filler words, keep the task text
  const fillers = [
    /\bremind\s+me\b/gi, /\balert\s+me\b/gi, /\bnotify\s+me\b/gi,
    /\bto\b/gi, /\bi\s+have\b/gi, /\bi\s+want\s+to\b/gi,
    /\bdo\s+this\b/gi, /\bwork\b/gi, /\btask\b/gi,
    new RegExp(matchedStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
  ]
  let description = text
  fillers.forEach((f) => { description = description.replace(f, " ") })
  description = description.replace(/\s{2,}/g, " ").trim()
  if (!description || description.length < 2) description = "Reminder"

  return { fireAt, description }
}

// ---------- Component ----------
export function CustomReminderWidget() {
  const [open, setOpen] = useState(false)
  const [reminders, setReminders] = useState<CustomReminder[]>([])
  const [input, setInput] = useState("")
  const [parsePreview, setParsePreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const firedSet = useRef<Set<string>>(new Set())

  // Load & prune past reminders
  useEffect(() => {
    const stored = loadReminders().filter((r) => r.fireAt > Date.now())
    setReminders(stored); saveReminders(stored)
  }, [])

  // Focus input when popover opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  // Live parse preview as user types
  useEffect(() => {
    if (!input.trim()) { setParsePreview(null); return }
    const result = parseNaturalLanguage(input)
    if (result) {
      const time = new Date(result.fireAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setParsePreview(`"${result.description}" at ${time}`)
    } else {
      setParsePreview(null)
    }
  }, [input])

  // Check reminders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = loadReminders()
      const now = Date.now()
      const still: CustomReminder[] = []
      stored.forEach((r) => {
        if (r.fireAt <= now && !firedSet.current.has(r.id)) {
          firedSet.current.add(r.id)
          playChime()
          toast.success(`⏰ ${r.label}`, {
            duration: 12000,
            description: "Your reminder just fired!",
            action: { label: "Dismiss", onClick: () => {} },
          })
        } else if (r.fireAt > now) {
          still.push(r)
        }
      })
      saveReminders(still); setReminders(still)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const addReminder = useCallback((label: string, fireAt: number) => {
    const r: CustomReminder = { id: `rem_${Date.now()}`, label, fireAt }
    const updated = [...loadReminders(), r]
    saveReminders(updated); setReminders(updated)
    const time = new Date(fireAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    toast.success(`⏰ Reminder set!`, { description: `"${label}" at ${time}` })
    setInput("")
  }, [])

  const handleNaturalSubmit = () => {
    if (!input.trim()) return
    const result = parseNaturalLanguage(input)
    if (!result) {
      toast.error("Couldn't understand the time. Try: \"remind me in 10 min\" or \"task at 5pm\"")
      return
    }
    addReminder(result.description, result.fireAt)
  }

  const handlePreset = (minutes: number, label: string) => {
    addReminder(`In ${label}`, Date.now() + minutes * 60000)
  }

  const removeReminder = (id: string) => {
    const updated = loadReminders().filter((r) => r.id !== id)
    saveReminders(updated); setReminders(updated)
  }

  const formatLeft = (fireAt: number) => {
    const diff = fireAt - Date.now()
    if (diff <= 0) return "Now"
    const mins = Math.ceil(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60); const rem = mins % 60
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
  }

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">

      {/* ── Panel ── */}
      {open && (
        <div className="w-[340px] bg-card border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Reminders</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">

            {/* ── Natural language input ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Natural language
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNaturalSubmit()}
                  placeholder='e.g. "task at 5pm" or "remind me in 10 min"'
                  className="flex-1 bg-background border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={handleNaturalSubmit}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Live parse preview */}
              {parsePreview && (
                <p className="text-[11px] text-primary mt-1.5 pl-1 flex items-center gap-1 animate-in fade-in duration-150">
                  <Clock className="w-3 h-3 shrink-0" />
                  Will remind: <span className="font-semibold">{parsePreview}</span>
                </p>
              )}
              {input.trim() && !parsePreview && (
                <p className="text-[11px] text-muted-foreground mt-1.5 pl-1">
                  Tip: include "in X min" or "at Xpm" to set a time
                </p>
              )}
            </div>

            {/* ── Presets ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(({ label, minutes }) => (
                  <button
                    key={label}
                    onClick={() => handlePreset(minutes, label)}
                    className="py-2 rounded-lg border text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-center"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Pending ── */}
            {reminders.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pending ({reminders.length})
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {reminders.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          in {formatLeft(r.fireAt)} · {new Date(r.fireAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => removeReminder(r.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-1">No pending reminders</p>
            )}
          </div>
        </div>
      )}

      {/* ── FAB Bell ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Reminders"
        style={{ width: 52, height: 52 }}
        className={`relative rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95
          ${open ? "bg-primary text-primary-foreground" : "bg-card border text-foreground hover:bg-muted"}
        `}
      >
        <Bell className={`w-5 h-5 ${open ? "" : "text-primary"}`} />
        {reminders.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
            {reminders.length}
          </span>
        )}
      </button>
    </div>
  )
}
