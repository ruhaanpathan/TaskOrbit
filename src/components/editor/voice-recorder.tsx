"use client"

import { useState, useEffect, useCallback } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Editor } from "@tiptap/react"

interface VoiceRecorderProps {
  editor: Editor | null
}

export function VoiceRecorder({ editor }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = 'en-US'

        let finalTranscript = ''

        rec.onstart = () => {
          setIsRecording(true)
          toast.success("Recording started. Speak now...")
          finalTranscript = ''
        }

        rec.onresult = (event: any) => {
          let interimTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript + ' '
              finalTranscript += text
              // Insert into editor immediately
              if (editor) {
                editor.commands.insertContent(text)
              }
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }
        }

        rec.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            toast.error("Speech recognition error: " + event.error)
            setIsRecording(false)
          }
        }

        rec.onend = () => {
          setIsRecording(false)
        }

        setRecognition(rec)
      }
    }
  }, [editor])

  const toggleRecording = useCallback(() => {
    if (!recognition) {
      toast.error("Speech recognition is not supported in this browser.")
      return
    }

    if (isRecording) {
      recognition.stop()
      toast.success("Recording saved!")
    } else {
      try {
        recognition.start()
      } catch (e) {
        console.error(e)
      }
    }
  }, [isRecording, recognition])

  if (!recognition) return null // Hide if not supported

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={toggleRecording}
      className={`h-8 gap-1.5 ml-1 transition-all ${
        isRecording 
          ? "bg-red-500/20 text-red-600 hover:bg-red-500/30 hover:text-red-700 dark:bg-red-500/20 dark:text-red-400 animate-pulse" 
          : "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 dark:text-rose-400 dark:bg-rose-500/20"
      }`}
    >
      {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      <span className="text-xs font-semibold">{isRecording ? "Stop" : "Dictate"}</span>
    </Button>
  )
}
