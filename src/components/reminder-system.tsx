"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { getGlobalReminders } from "@/lib/actions/notes"

interface ReminderSystemProps {
  userId: string
}

export function ReminderSystem({ userId }: ReminderSystemProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const notifiedSet = useRef<Set<string>>(new Set())
  const parsedTimeCache = useRef<Record<string, Date>>({})

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(setPermission)
    }
  }, [])

  useEffect(() => {
    if (permission !== "granted") return

    // Simple parser for absolute ("at 10am") and relative ("in 10 min") times
    const parseTimeForToday = (text: string): Date | null => {
      const lowerText = text.toLowerCase()
      
      // Check for relative time: "in X min" or "in X hour"
      const relativeMatch = lowerText.match(/in\s+(?:next\s+)?(\d+)\s*(min|minute|hour|hr)s?/)
      if (relativeMatch) {
        const amount = parseInt(relativeMatch[1], 10)
        const unit = relativeMatch[2]
        const date = new Date()
        if (unit.startsWith('min')) {
          date.setMinutes(date.getMinutes() + amount)
        } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
          date.setHours(date.getHours() + amount)
        }
        return date
      }

      // Check for absolute time: "at 10am", "at 14:00"
      const absoluteMatch = lowerText.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
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

    // Web Audio API for a pleasant notification chime that repeats 5 times
    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        // Loop to play the chime 3 times, spaced 0.6 seconds apart
        for (let i = 0; i < 3; i++) {
          const startTime = audioCtx.currentTime + (i * 0.6)
          
          const oscillator = audioCtx.createOscillator()
          const gainNode = audioCtx.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioCtx.destination)

          oscillator.type = 'sine'
          
          // High pleasant pitched double-beep
          oscillator.frequency.setValueAtTime(880, startTime) // A5
          oscillator.frequency.setValueAtTime(1046.50, startTime + 0.1) // C6
          
          gainNode.gain.setValueAtTime(0, startTime)
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
          gainNode.gain.linearRampToValueAtTime(0, startTime + 0.3)

          oscillator.start(startTime)
          oscillator.stop(startTime + 0.4)
        }
      } catch (e) {
        console.error("Audio play failed", e)
      }
    }

    const checkReminders = async () => {
      try {
        const currentTasks = await getGlobalReminders(userId)
        const now = new Date()

        currentTasks.forEach(task => {
          let targetTime = parsedTimeCache.current[task.text]
          
          if (!targetTime) {
            targetTime = parseTimeForToday(task.text)
            if (targetTime) {
              parsedTimeCache.current[task.text] = targetTime
            }
          }

          if (!targetTime) return

          const diffMs = targetTime.getTime() - now.getTime()
          const diffMinutes = Math.floor(diffMs / 60000)

          const is10MinWarning = diffMinutes === 10
          const isNow = diffMinutes === 0
          
          const warningKey = `${task.text}-10min`
          const nowKey = `${task.text}-now`

          if (is10MinWarning && !notifiedSet.current.has(warningKey)) {
            playNotificationSound()
            new Notification(`Reminder: ${task.noteTitle}`, {
              body: `Upcoming in 10 mins: ${task.text}`,
            })
            notifiedSet.current.add(warningKey)
          }

          if (isNow && !notifiedSet.current.has(nowKey)) {
            playNotificationSound()
            new Notification(`Starting Now: ${task.noteTitle}`, {
              body: task.text,
            })
            toast.info(`Meeting starting now: ${task.text}`)
            notifiedSet.current.add(nowKey)
          }
        })
      } catch (err) {
        console.error("Failed to fetch reminders:", err)
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkReminders, 30000)
    checkReminders()

    return () => clearInterval(interval)
  }, [permission, userId])

  // We will just return null here so the annoying floating button goes away.
  // If you ever want notifications, you can just enable them in your browser settings directly!
  return null
}
