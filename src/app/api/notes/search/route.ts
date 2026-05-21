import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const tagsParam = searchParams.get("tags")
    const sort = searchParams.get("sort") === "createdAt" ? "createdAt" : "updatedAt"

    let whereClause: any = {
      userId: session.user.id,
      isArchived: false,
    }

    if (q) {
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { noteTags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } }
      ]
    }

    if (tagsParam) {
      const tags = tagsParam.split(",").filter(Boolean)
      if (tags.length > 0) {
        whereClause.noteTags = {
          some: {
            tag: {
              name: { in: tags, mode: 'insensitive' }
            }
          }
        }
      }
    }

    const notes = await db.note.findMany({
      where: whereClause,
      include: {
        noteTags: {
          include: { tag: true }
        }
      },
      orderBy: {
        [sort]: "desc"
      }
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
