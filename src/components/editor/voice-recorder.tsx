"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, MicOff, Loader2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Editor } from "@tiptap/react"

interface VoiceRecorderProps {
  editor: Editor | null
}

type RecorderState = "idle" | "recording" | "processing"

export function VoiceRecorder({ editor }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle")
  const [isSupported, setIsSupported] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<Editor | null>(null)

  // Always keep the editor ref fresh so callbacks never use stale closures
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Check if MediaRecorder (full audio recording) is supported
  useEffect(() => {
    if (typeof window !== "undefined" && typeof MediaRecorder !== "undefined") {
      setIsSupported(true)
    }
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick the best supported audio format for the browser
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4"

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all microphone tracks to release the mic indicator in the browser
        stream.getTracks().forEach((t) => t.stop())

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        if (audioBlob.size < 1000) {
          toast.error("Recording was too short. Please speak for at least a second.")
          setState("idle")
          setRecordingSeconds(0)
          return
        }

        await processAudio(audioBlob, mimeType)
      }

      // Collect data every 250ms for reliability on all browsers
      mediaRecorder.start(250)
      setState("recording")
      setRecordingSeconds(0)

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          // Auto-stop at 5 minutes to prevent huge files
          if (prev >= 299) {
            stopRecording()
            toast.warning("Recording auto-stopped at 5 minutes.")
            return prev
          }
          return prev + 1
        })
      }, 1000)

      toast.success("🎙️ Recording started — speak now")
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings and try again.")
      } else {
        toast.error("Could not access microphone. Please check your device settings.")
        console.error("MediaRecorder start error:", err)
      }
      setState("idle")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setState("processing")
    }
  }, [])

  const processAudio = async (audioBlob: Blob, mimeType: string) => {
    const toastId = toast.loading("🤖 AI is transcribing and structuring your voice note...")

    try {
      const formData = new FormData()
      formData.append("audio", new File([audioBlob], "voice-note", { type: mimeType }))

      const response = await fetch("/api/notes/voice-to-note", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process voice note")
      }

      const { html, title } = data

      // Insert the AI-formatted note into the Tiptap editor
      const currentEditor = editorRef.current
      if (currentEditor) {
        const currentContent = currentEditor.getHTML()
        const isEmpty = currentContent === "<p></p>" || currentContent === "" || !currentContent

        if (isEmpty) {
          // Replace empty editor content entirely
          currentEditor.commands.setContent(html)
        } else {
          // Append after existing content with a separator
          currentEditor.commands.insertContentAt(
            currentEditor.state.doc.content.size,
            `<hr />${html}`
          )
        }

        // Move cursor to end
        currentEditor.commands.focus("end")
      }

      toast.success(`✅ Voice note "${title}" added to your note!`, { id: toastId })
    } catch (err: any) {
      console.error("Voice-to-note processing error:", err)
      toast.error(err.message || "Failed to process voice note. Please try again.", { id: toastId })
    } finally {
      setState("idle")
      setRecordingSeconds(0)
    }
  }

  const handleClick = useCallback(() => {
    if (state === "idle") {
      startRecording()
    } else if (state === "recording") {
      stopRecording()
    }
    // "processing" state: button is disabled, do nothing
  }, [state, startRecording, stopRecording])

  // Don't render the button if the browser doesn't support MediaRecorder
  if (!isSupported) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={handleClick}
      disabled={state === "processing"}
      title={
        state === "idle"
          ? "Record a voice note — AI will transcribe and format it"
          : state === "recording"
          ? "Click to stop recording"
          : "Processing your voice note..."
      }
      className={`h-8 gap-1.5 ml-1 transition-all ${
        state === "recording"
          ? "bg-red-500/20 text-red-600 hover:bg-red-500/30 hover:text-red-700 dark:bg-red-500/20 dark:text-red-400 animate-pulse"
          : state === "processing"
          ? "bg-primary/10 text-primary cursor-not-allowed opacity-80"
          : "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 dark:text-rose-400 dark:bg-rose-500/20"
      }`}
    >
      {state === "processing" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs font-semibold">Processing...</span>
        </>
      ) : state === "recording" ? (
        <>
          <MicOff className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold tabular-nums">
            Stop {formatTime(recordingSeconds)}
          </span>
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Dictate</span>
        </>
      )}
    </Button>
  )
}
