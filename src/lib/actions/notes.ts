"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { GoogleGenAI } from "@google/genai"
import { getGeminiKey } from "@/lib/ai"

export async function createNote(userId: string) {
  const note = await db.note.create({
    data: {
      userId,
      title: "Untitled",
      content: "",
    }
  })

  revalidatePath("/notes")
  return note.id
}

export async function getNotes(userId: string) {
  return await db.note.findMany({
    where: {
      userId,
      isArchived: false,
    },
    include: {
      noteTags: {
        include: { tag: true }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

export async function archiveNote(id: string, userId: string) {
  await db.note.update({
    where: { id, userId },
    data: { isArchived: true }
  })
  revalidatePath("/notes")
  revalidatePath("/archive")
  revalidatePath("/dashboard")
}

export async function unarchiveNote(id: string, userId: string) {
  await db.note.update({
    where: { id, userId },
    data: { isArchived: false }
  })
  revalidatePath("/notes")
  revalidatePath("/archive")
  revalidatePath("/dashboard")
}

export async function getArchivedNotes(userId: string) {
  return await db.note.findMany({
    where: {
      userId,
      isArchived: true,
    },
    include: {
      noteTags: {
        include: { tag: true }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

export async function emptyArchive(userId: string) {
  await db.note.deleteMany({
    where: {
      userId,
      isArchived: true,
    }
  })
  revalidatePath("/archive")
  revalidatePath("/dashboard")
}

export async function deleteNote(id: string, userId: string) {
  // First, get the tags associated with this note
  const tagsInNote = await db.noteTag.findMany({
    where: { noteId: id },
    select: { tagId: true }
  })

  await db.note.delete({
    where: { id, userId }
  })

  // Clean up any tags that are no longer used by any notes
  for (const { tagId } of tagsInNote) {
    const count = await db.noteTag.count({ where: { tagId } })
    if (count === 0) {
      await db.tag.delete({ where: { id: tagId } })
    }
  }

  revalidatePath("/notes")
}

export async function updateNote(
  id: string,
  userId: string,
  data: { title: string; content: string }
) {
  await db.note.update({
    where: { id, userId },
    data: {
      title: data.title,
      content: data.content,
    }
  })
  revalidatePath(`/notes/${id}`)
  revalidatePath("/notes")
}

export async function addTagToNote(noteId: string, tagName: string, userId: string) {
  const normalizedName = tagName.trim().toLowerCase()
  if (!normalizedName) return

  // Find or create tag
  const tag = await db.tag.upsert({
    where: {
      name_userId: {
        name: normalizedName,
        userId: userId
      }
    },
    update: {},
    create: {
      name: normalizedName,
      userId: userId
    }
  })

  // Create relation if it doesn't exist
  await db.noteTag.upsert({
    where: {
      noteId_tagId: {
        noteId,
        tagId: tag.id
      }
    },
    update: {},
    create: {
      noteId,
      tagId: tag.id
    }
  })

  revalidatePath(`/notes/${noteId}`)
  revalidatePath("/notes")
  return tag
}

export async function removeTagFromNote(noteId: string, tagId: string) {
  await db.noteTag.delete({
    where: {
      noteId_tagId: {
        noteId,
        tagId
      }
    }
  })

  // Clean up the tag from the database if no other notes are using it
  const remainingUsage = await db.noteTag.count({
    where: { tagId }
  })

  if (remainingUsage === 0) {
    await db.tag.delete({
      where: { id: tagId }
    })
  }

  revalidatePath(`/notes/${noteId}`)
  revalidatePath("/notes")
}

export async function toggleNotePublic(noteId: string, userId: string, isPublic: boolean) {
  await db.note.update({
    where: { id: noteId, userId },
    data: { isPublic }
  })

  revalidatePath(`/notes/${noteId}`)
  revalidatePath("/notes")
}

export async function updateAiLogActionItems(logId: string, actionItems: any) {
  await db.aiLog.update({
    where: { id: logId },
    data: { actionItems: JSON.stringify(actionItems) }
  })
}

export async function magicFormatNote(rawText: string) {
  const now = new Date().toLocaleString()

  const prompt = `
You are an expert HTML formatter. The user has typed a rough, unstructured brain-dump note.
Convert this text into beautifully structured HTML and suggest a title.
Follow these strict rules:
1. Normal paragraphs must be wrapped in <p>...</p>.
2. If a line describes a task, to-do, or action item, convert it into this EXACT HTML structure:
   <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label contenteditable="false"><input type="checkbox"></label><div><p>Task goes here</p></div></li></ul>
3. IMPORTANT: If an action item involves a meeting, call, zoom, sync, or schedule, you MUST prefix the text with '🎥 Meeting: '. Example: <div><p>🎥 Meeting: call the client</p></div>
4. Wrap any code snippets in <pre><code>...</code></pre>.
5. Prepend a formatted date/time stamp to the very top of the HTML output like this: <p><small><em>🕒 Formatted on: ${now}</em></small></p>

Return ONLY a valid JSON object with exactly two keys:
- "title": a short, concise, highly descriptive title for the note (max 4 words).
- "html": the fully formatted HTML string (including the timestamp paragraph at the top).
Do not include any markdown fences (like \`\`\`json). Just the raw JSON string.

Rough Text:
${rawText}
  `.trim()

  let retries = 5;
  let delay = 1000;

  while (retries > 0) {
    try {
      const apiKey = getGeminiKey()
      const ai = new GoogleGenAI({ apiKey })

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.1 }
      })

      let text = response.text || "{}"
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim()
      const parsed = JSON.parse(text)

      return {
        title: parsed.title || "Formatted Note",
        html: parsed.html || ""
      }
    } catch (error) {
      console.warn(`Magic Format Error. Retries left: ${retries - 1}`);
      if (retries > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        continue;
      }
      throw new Error("All API keys are currently exhausted or blocked. Please try again later.")
    }
  }

  throw new Error("Failed to format note.")
}

export async function getGlobalReminders(userId: string) {
  const notes = await db.note.findMany({
    where: { userId, isArchived: false },
    select: { id: true, title: true, content: true }
  })

  const tasks: { text: string; noteTitle: string }[] = []

  notes.forEach(note => {
    if (!note.content) return
    const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi
    let match
    while ((match = regex.exec(note.content)) !== null) {
      const attributes = match[1]
      if (attributes.includes('data-type="taskItem"') && attributes.includes('data-checked="false"')) {
        let rawText = match[2].replace(/<[^>]*>/g, '').trim()
        if (rawText) {
          tasks.push({ text: rawText, noteTitle: note.title })
        }
      }
    }
  })

  return tasks
}
