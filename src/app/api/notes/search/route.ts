import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

// Strip HTML tags and return plain text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim()
}

// Extract a ~120-char snippet around the first occurrence of the query in the text
function getSnippet(text: string, query: string): string | null {
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 80)
  const snippet = text.slice(start, end)
  return (start > 0 ? "..." : "") + snippet + (end < text.length ? "..." : "")
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const tagsParam = searchParams.get("tags")
    const sort = searchParams.get("sort") === "createdAt" ? "createdAt" : "updatedAt"

    // Require at least 1 character to search
    if (!q && !tagsParam) {
      return NextResponse.json([])
    }

    const whereClause: any = {
      userId: session.user.id,
      isArchived: false,
    }

    if (q) {
      whereClause.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { noteTags: { some: { tag: { name: { contains: q, mode: "insensitive" } } } } },
      ]
    }

    if (tagsParam) {
      const tags = tagsParam.split(",").filter(Boolean)
      if (tags.length > 0) {
        whereClause.noteTags = {
          some: { tag: { name: { in: tags, mode: "insensitive" } } },
        }
      }
    }

    const notes = await db.note.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        content: true, // needed to build snippet, NOT sent to client raw
        updatedAt: true,
        noteTags: {
          select: { tag: { select: { id: true, name: true } } },
        },
      },
      orderBy: { [sort]: "desc" },
      take: 12, // Hard cap — never return more than 12 results
    })

    // Build lightweight response — strip content, add snippet
    const results = notes.map((note) => {
      const plainText = stripHtml(note.content || "")
      const snippet = q ? getSnippet(plainText, q) : null

      return {
        id: note.id,
        title: note.title,
        updatedAt: note.updatedAt,
        noteTags: note.noteTags,
        // Content snippet around the match — much smaller than full content
        snippet: snippet || (plainText.length > 120 ? plainText.slice(0, 120) + "..." : plainText || null),
        matchedIn: snippet ? "content" : "title",
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
