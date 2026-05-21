import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { GoogleGenAI } from "@google/genai"
import { getGeminiKey } from "@/lib/ai"

export async function POST(req: NextRequest) {
  try {
    // Auth guard — only authenticated users can use this
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read the audio blob from the multipart form
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Enforce a 25 MB file size limit to prevent abuse
    const MAX_SIZE_BYTES = 25 * 1024 * 1024
    if (audioFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Audio file is too large (max 25 MB)" }, { status: 413 })
    }

    // Convert the audio blob to base64 for Gemini's inline data format
    const audioBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString("base64")
    const mimeType = audioFile.type || "audio/webm"

    const now = new Date().toLocaleString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    })

    const prompt = `
You are an expert productivity assistant and note-taker.
The user has just recorded a voice note. Your job is to:
1. Accurately transcribe the audio.
2. Intelligently restructure and format the transcription into a clean, well-organised note.

Formatting rules (strict):
- Normal paragraphs: wrap in <p>...</p>
- Action items, tasks, to-dos: use this EXACT structure:
  <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label contenteditable="false"><input type="checkbox"></label><div><p>task text here</p></div></li></ul>
- Meeting-related tasks (meet, call, zoom, sync, schedule, discuss): prefix text with '🎥 Meeting: '
- Code snippets: wrap in <pre><code>...</code></pre>
- Headings: use <h2> for major sections, <h3> for sub-sections
- Add this timestamp at the very top: <p><small><em>🎙️ Voice note recorded on: ${now}</em></small></p>

Return ONLY a valid raw JSON object with exactly two keys:
- "title": a short, descriptive title (max 5 words)
- "html": the fully formatted HTML string

Do NOT include markdown code fences, backticks, or any explanation. Just the raw JSON.
    `.trim()

    let retries = 5
    let delay = 1000

    while (retries > 0) {
      try {
        const apiKey = getGeminiKey()
        const ai = new GoogleGenAI({ apiKey })

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              parts: [
                {
                  // Send the actual audio to Gemini for transcription
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: { temperature: 0.1 },
        })

        let text = response.text || "{}"
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(text)

        return NextResponse.json({
          title: parsed.title || "Voice Note",
          html: parsed.html || "<p>(No content transcribed)</p>",
        })
      } catch (error: any) {
        console.warn(`Voice-to-note API error. Retries left: ${retries - 1}`, error?.message)
        if (retries > 1) {
          await new Promise((resolve) => setTimeout(resolve, delay))
          retries--
          delay *= 2 // Exponential backoff
          continue
        }
        throw error
      }
    }

    throw new Error("Failed after all retries")
  } catch (error: any) {
    console.error("voice-to-note route error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to process voice note. Please try again." },
      { status: 500 }
    )
  }
}
