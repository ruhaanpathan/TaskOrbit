import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { generateNoteInsights } from "@/lib/ai"

// Simple in-memory rate limiting (Replace with Upstash Redis in production)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Check rate limit (max 5 calls per hour)
    const now = Date.now()
    const limit = rateLimit.get(userId)
    
    if (limit && limit.resetAt > now) {
      if (limit.count >= 5) {
        return NextResponse.json({ error: "Rate limit exceeded (5 calls per hour)." }, { status: 429 })
      }
      limit.count += 1
    } else {
      rateLimit.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    }

    // Verify note ownership
    const note = await db.note.findUnique({
      where: { id, userId }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Generate insights
    const insights = await generateNoteInsights(note.title, note.content)

    // Save to AiLog
    const aiLog = await db.aiLog.create({
      data: {
        noteId: note.id,
        summary: insights.summary || "No summary available",
        actionItems: JSON.stringify(insights.actionItems || []),
        suggestedTitle: insights.suggestedTitle || "Untitled"
      }
    })

    return NextResponse.json({
      ...insights,
      logId: aiLog.id
    })

  } catch (error: any) {
    console.error("AI Generation Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate insights" }, { status: 500 })
  }
}
