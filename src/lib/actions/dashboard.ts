"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function completeTaskGlobal(type: 'ai' | 'manual', noteId: string, taskText: string, logId?: string, taskIndex?: number) {
  if (type === 'ai' && logId !== undefined && taskIndex !== undefined) {
    const aiLog = await db.aiLog.findUnique({ where: { id: logId } })
    if (aiLog && aiLog.actionItems) {
      try {
        const items = JSON.parse(aiLog.actionItems)
        if (items[taskIndex]) {
          if (typeof items[taskIndex] === 'string') {
            items[taskIndex] = { text: items[taskIndex], completed: true }
          } else {
            items[taskIndex].completed = true
          }
          await db.aiLog.update({ 
            where: { id: logId }, 
            data: { actionItems: JSON.stringify(items) } 
          })
        }
      } catch (e) {
        console.error("Failed to parse AI action items", e)
      }
    }
  } else if (type === 'manual') {
    const note = await db.note.findUnique({ where: { id: noteId } })
    if (note && note.content) {
      const regex = /<li([^>]*)data-checked="false"([^>]*)>([\s\S]*?)<\/li>/gi;
      let newContent = note.content;
      let match;
      
      // Need to find the exact list item
      const liRegex = /<li[^>]*>[\s\S]*?<\/li>/gi;
      let liMatch;
      
      while ((liMatch = liRegex.exec(note.content)) !== null) {
        const originalLi = liMatch[0];
        // Only target unchecked task items
        if (originalLi.includes('data-type="taskItem"') && originalLi.includes('data-checked="false"')) {
          let rawText = originalLi.replace(/<[^>]*>/g, '').trim();
          if (rawText === taskText.trim()) {
            const updatedLi = originalLi.replace('data-checked="false"', 'data-checked="true"');
            newContent = newContent.replace(originalLi, updatedLi);
            break; // Stop after completing one
          }
        }
      }
      
      await db.note.update({ 
        where: { id: noteId }, 
        data: { content: newContent } 
      })
    }
  }
  
  revalidatePath('/dashboard')
  revalidatePath(`/notes/${noteId}`)
}
