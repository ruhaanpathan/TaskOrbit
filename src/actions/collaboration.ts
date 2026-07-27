"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { sendTaskNotificationEmail } from "@/lib/mail"

// Helper to get logged in user
async function getRequireUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user
}

// 1. Get full details of a shared task list for rendering
export async function getSharedTaskDetails(shareId: string) {
  const session = await auth()
  const currentUserId = session?.user?.id

  const note = await db.note.findUnique({
    where: { shareId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      companyWorkspace: true,
      collaborators: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      checkItems: true,
      comments: {
        orderBy: { createdAt: "asc" }
      },
      noteTags: { include: { tag: true } }
    }
  })

  if (!note || !note.isPublic) {
    return null
  }

  const isOwner = currentUserId === note.userId
  const collaborator = currentUserId 
    ? note.collaborators.find((c) => c.userId === currentUserId)
    : null
  const isCollaborator = !!collaborator || isOwner

  let joinRequestStatus: string | null = null
  if (currentUserId && !isCollaborator) {
    const existingReq = await db.taskJoinRequest.findUnique({
      where: { noteId_userId: { noteId: note.id, userId: currentUserId } }
    })
    joinRequestStatus = existingReq?.status || null
  }

  const pendingRequests = isOwner 
    ? await db.taskJoinRequest.findMany({
        where: { noteId: note.id, status: "PENDING" },
        include: { user: { select: { id: true, name: true, email: true } } }
      })
    : []

  // Server-side task parsing to prevent hydration mismatch
  const parsedTasks: { text: string; isChecked: boolean }[] = []
  if (note.content) {
    const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi
    let match
    while ((match = regex.exec(note.content)) !== null) {
      const attributes = match[1]
      let rawText = match[2].replace(/<[^>]*>/g, '').trim()
      if (rawText) {
        const isChecked = attributes.includes('data-checked="true"')
        parsedTasks.push({ text: rawText, isChecked })
      }
    }
  }

  return {
    note,
    parsedTasks,
    isOwner,
    isCollaborator,
    joinRequestStatus,
    pendingRequests,
    currentUserId,
    currentUserName: session?.user?.name || session?.user?.email || "User"
  }
}

// 2. Request Access to Join a Shared Task List
export async function requestJoinTask(shareId: string) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({
    where: { shareId },
    select: { id: true, title: true, userId: true }
  })

  if (!note) return { error: "Task list not found" }
  if (note.userId === user.id) return { error: "You are the owner of this task list" }

  // Check if already collaborator
  const existingCollab = await db.taskCollaborator.findUnique({
    where: { noteId_userId: { noteId: note.id, userId: user.id } }
  })
  if (existingCollab) return { error: "You are already an authorized collaborator" }

  // Create or update Join Request
  await db.taskJoinRequest.upsert({
    where: { noteId_userId: { noteId: note.id, userId: user.id } },
    create: { noteId: note.id, userId: user.id, status: "PENDING" },
    update: { status: "PENDING" }
  })

  // Notify Owner / HR
  await db.notification.create({
    data: {
      userId: note.userId,
      type: "JOIN_REQUEST",
      title: "New Join Request",
      message: `${user.name || user.email} requested access to join "${note.title}"`,
      link: `/shared/${shareId}`
    }
  })

  return { success: true }
}

// 3. Owner Responds to Join Request (Accept / Reject)
export async function respondToJoinRequest(requestId: string, status: "ACCEPTED" | "REJECTED") {
  const user = await getRequireUser()

  const req = await db.taskJoinRequest.findUnique({
    where: { id: requestId },
    include: { note: true }
  })

  if (!req) return { error: "Request not found" }
  if (req.note.userId !== user.id) return { error: "Only the task owner can accept/reject requests" }

  await db.taskJoinRequest.update({
    where: { id: requestId },
    data: { status }
  })

  if (status === "ACCEPTED") {
    await db.taskCollaborator.upsert({
      where: { noteId_userId: { noteId: req.noteId, userId: req.userId } },
      create: { noteId: req.noteId, userId: req.userId, role: "COLLABORATOR" },
      update: { role: "COLLABORATOR" }
    })

    // Notify requesting user
    await db.notification.create({
      data: {
        userId: req.userId,
        type: "REQUEST_ACCEPTED",
        title: "Access Approved!",
        message: `Your request to join "${req.note.title}" was approved by ${user.name || "the owner"}.`,
        link: `/shared/${req.note.shareId}`
      }
    })
  }

  return { success: true }
}

// 4. Toggle Collaborative Task Completion with GitHub-style Attribution
export async function toggleCollaborativeTask(shareId: string, taskText: string, isCompleted: boolean) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({
    where: { shareId },
    include: { collaborators: true }
  })

  if (!note) return { error: "Note not found" }

  const isOwner = note.userId === user.id
  const isCollaborator = note.collaborators.some((c) => c.userId === user.id)

  if (!isOwner && !isCollaborator) {
    return { error: "You are not authorized to check tasks on this list" }
  }

  const cleanTaskText = taskText.trim()

  if (isCompleted) {
    const status = isOwner ? "APPROVED" : "PENDING_REVIEW"

    const checkItem = await db.taskCheckItem.upsert({
      where: { noteId_taskText: { noteId: note.id, taskText: cleanTaskText } },
      create: {
        noteId: note.id,
        taskText: cleanTaskText,
        completedByUserId: user.id,
        completedByName: user.name || user.email || "Owner",
        status,
        completedAt: new Date()
      },
      update: {
        completedByUserId: user.id,
        completedByName: user.name || user.email || "Owner",
        status,
        completedAt: new Date()
      }
    })

    // If owner completed it, immediately update the note HTML content as checked
    if (isOwner && note.content) {
      const liRegex = /<li[^>]*>[\s\S]*?<\/li>/gi
      let newContent = note.content
      let liMatch

      while ((liMatch = liRegex.exec(note.content)) !== null) {
        const originalLi = liMatch[0]
        if (originalLi.includes('data-type="taskItem"')) {
          const rawText = originalLi.replace(/<[^>]*>/g, '').trim()
          if (rawText === cleanTaskText) {
            const updatedLi = originalLi.replace('data-checked="false"', 'data-checked="true"')
            newContent = newContent.replace(originalLi, updatedLi)
            break
          }
        }
      }

      await db.note.update({
        where: { id: note.id },
        data: { content: newContent }
      })
    } else if (!isOwner) {
      // 1. In-app notification for Owner
      await db.notification.create({
        data: {
          userId: note.userId,
          type: "TASK_COMPLETED",
          title: "Task Completed",
          message: `${user.name || user.email} checked off "${cleanTaskText}" in "${note.title}"`,
          link: `/shared/${shareId}`
        }
      })

      // 2. Email notification to Task Owner
      const ownerUser = await db.user.findUnique({
        where: { id: note.userId },
        select: { email: true, name: true }
      })

function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "")
  }
  // Use primary canonical production domain so emails keep users logged in
  return "https://task-orbit-delta.vercel.app"
}

      if (ownerUser?.email) {
        const memberDisplayName = user.name || user.email || "Team Member"
        const appUrl = getAppBaseUrl()
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background: #ffffff; color: #111;">
            <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px;">
              <h1 style="font-size: 20px; font-weight: 800; color: #111; margin: 0;">TaskOrbit</h1>
              <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">Shared Task Completed — Review Required</p>
            </div>

            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">
                <strong>${memberDisplayName}</strong> completed a task in your shared list <strong>"${note.title}"</strong>:
              </p>

              <div style="background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 14px 18px; border-radius: 8px; font-weight: 700; font-size: 15px; margin-bottom: 16px;">
                ✓ ${cleanTaskText}
              </div>

              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                Please log in to your TaskOrbit dashboard to review and <strong>Accept</strong> or <strong>Reject</strong> this task.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${appUrl}/shared/${shareId}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px;">
                Review Task on TaskOrbit →
              </a>
            </div>
          </div>
        `

// Helper to format short, clean email subjects even if task content is long
function formatShortTaskSubject(prefix: string, taskText: string, noteTitle?: string) {
  const cleanText = taskText.trim().replace(/\s+/g, ' ')
  const shortTask = cleanText.length > 35 ? cleanText.substring(0, 35) + '...' : cleanText
  if (noteTitle) {
    const cleanTitle = noteTitle.trim().replace(/\s+/g, ' ')
    const shortTitle = cleanTitle.length > 25 ? cleanTitle.substring(0, 25) + '...' : cleanTitle
    return `[TaskOrbit] ${prefix}: "${shortTask}" in "${shortTitle}"`
  }
  return `[TaskOrbit] ${prefix}: "${shortTask}"`
}

        await sendTaskNotificationEmail({
          to: ownerUser.email,
          subject: formatShortTaskSubject("Task Review Required", cleanTaskText, note.title),
          html
        })
      }
    }

    return { success: true, checkItem }
  } else {
    // Only the owner is allowed to uncheck completed tasks!
    if (!isOwner) {
      return { error: "Only the owner can uncheck tasks" }
    }

    // Unchecked -> remove completion record and uncheck in HTML
    await db.taskCheckItem.deleteMany({
      where: { noteId: note.id, taskText: cleanTaskText }
    })

    if (note.content) {
      const liRegex = /<li[^>]*>[\s\S]*?<\/li>/gi
      let newContent = note.content
      let liMatch

      while ((liMatch = liRegex.exec(note.content)) !== null) {
        const originalLi = liMatch[0]
        if (originalLi.includes('data-type="taskItem"')) {
          const rawText = originalLi.replace(/<[^>]*>/g, '').trim()
          if (rawText === cleanTaskText) {
            const updatedLi = originalLi.replace('data-checked="true"', 'data-checked="false"')
            newContent = newContent.replace(originalLi, updatedLi)
            break
          }
        }
      }

      await db.note.update({
        where: { id: note.id },
        data: { content: newContent }
      })
    }

    return { success: true }
  }
}

// Owner Review & Approval Action for Shared Tasks
export async function reviewSharedTaskCompletion(
  checkItemId?: string, 
  action: "APPROVE" | "REJECT",
  noteId?: string,
  taskText?: string
) {
  try {
    const user = await getRequireUser()

    let checkItem = (checkItemId && checkItemId.trim().length > 0)
      ? await db.taskCheckItem.findUnique({
          where: { id: checkItemId },
          include: { note: { include: { user: { select: { id: true, email: true } }, collaborators: { include: { user: { select: { email: true, name: true } } } } } } }
        })
      : null

    if (!checkItem && noteId && taskText) {
      const cleanText = taskText.trim()
      checkItem = await db.taskCheckItem.findFirst({
        where: { noteId, taskText: cleanText },
        include: { note: { include: { user: { select: { id: true, email: true } }, collaborators: { include: { user: { select: { email: true, name: true } } } } } } }
      })
    }

    // Get note object
    let note = checkItem?.note || null
    if (!note && noteId) {
      note = await db.note.findUnique({
        where: { id: noteId },
        include: { user: { select: { id: true, email: true } }, collaborators: { include: { user: { select: { email: true, name: true } } } } }
      })
    }

    if (!note) return { error: "Task list not found" }

    const isOwner = note.userId === user.id || (user.email && note.user?.email === user.email)
    if (!isOwner) return { error: "Only the owner can review completed tasks" }

  const cleanText = (taskText || checkItem?.taskText || "").trim()

  // 1. Resolve recipient emails (collaborators on this note)
  const rawEmails: string[] = []

  if (checkItem?.completedByUserId) {
    const memberUser = await db.user.findUnique({
      where: { id: checkItem.completedByUserId },
      select: { email: true }
    })
    if (memberUser?.email) {
      rawEmails.push(memberUser.email)
    }
  }

  if (checkItem?.completedByName?.includes("@")) {
    rawEmails.push(checkItem.completedByName.trim())
  }

  if (note.collaborators?.length > 0) {
    note.collaborators.forEach((col: any) => {
      if (col.user?.email) {
        rawEmails.push(col.user.email)
      }
    })
  }

  // Deduplicate emails and fallback to current user's email if testing
  let recipientEmails = Array.from(new Set(rawEmails.filter(Boolean)))
  if (recipientEmails.length === 0 && user.email) {
    recipientEmails = [user.email]
  }

  const ownerDisplayName = user.name || user.email || "Owner"
  const appUrl = getAppBaseUrl()

  if (action === "APPROVE") {
    // 1. If checkItem exists, update status to APPROVED
    if (checkItem) {
      await db.taskCheckItem.update({
        where: { id: checkItem.id },
        data: { status: "APPROVED" }
      })
    }

    // 2. Mark task as checked in the note's HTML content
    if (note.content) {
      const liRegex = /<li[^>]*>[\s\S]*?<\/li>/gi
      let newContent = note.content
      let liMatch

      while ((liMatch = liRegex.exec(note.content)) !== null) {
        const originalLi = liMatch[0]
        if (originalLi.includes('data-type="taskItem"')) {
          const rawText = originalLi.replace(/<[^>]*>/g, '').trim()
          if (rawText === cleanText) {
            const updatedLi = originalLi.replace('data-checked="false"', 'data-checked="true"')
            newContent = newContent.replace(originalLi, updatedLi)
            break
          }
        }
      }

      await db.note.update({
        where: { id: note.id },
        data: { content: newContent }
      })
    }

    // 3. In-app Notification for member
    if (checkItem?.completedByUserId) {
      try {
        await db.notification.create({
          data: {
            userId: checkItem.completedByUserId,
            type: "TASK_APPROVED",
            title: "Task Approved!",
            message: `Your completion of "${cleanText}" in "${note.title}" was approved by the owner.`,
            link: `/shared/${note.shareId}`
          }
        })
      } catch (e) {
        console.error("Failed to create in-app notification:", e)
      }
    }

    // 4. Email Notification to all member emails
    for (const email of recipientEmails) {
      try {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background: #ffffff; color: #111;">
            <div style="border-bottom: 2px solid #22c55e; padding-bottom: 16px; margin-bottom: 24px;">
              <h1 style="font-size: 20px; font-weight: 800; color: #111; margin: 0;">TaskOrbit</h1>
              <p style="font-size: 13px; color: #16a34a; font-weight: 700; margin: 4px 0 0;">🎉 Task Completion Approved!</p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #166534; margin: 0 0 16px;">
                Great job! Your completion of <strong>"${cleanText}"</strong> in <strong>"${note.title}"</strong> was accepted and approved by the owner <strong>(${ownerDisplayName})</strong>.
              </p>
              <div style="background: #ffffff; border: 1px solid #86efac; color: #15803d; padding: 14px 18px; border-radius: 8px; font-weight: 700; font-size: 15px;">
                ✓ Approved & Completed
              </div>
            </div>
          </div>
        `

        await sendTaskNotificationEmail({
          to: email,
          subject: formatShortTaskSubject("Task Approved! 🎉", cleanText, note.title),
          html
        })
      } catch (e) {
        console.error("Failed to send approval email:", e)
      }
    }
  } else {
    // REJECT: Delete completion record if exists, and uncheck task in note HTML so it resets completely
    if (checkItem) {
      await db.taskCheckItem.delete({ where: { id: checkItem.id } })
    }

    if (note.content) {
      const liRegex = /<li[^>]*>[\s\S]*?<\/li>/gi
      let newContent = note.content
      let liMatch

      while ((liMatch = liRegex.exec(note.content)) !== null) {
        const originalLi = liMatch[0]
        if (originalLi.includes('data-type="taskItem"')) {
          const rawText = originalLi.replace(/<[^>]*>/g, '').trim()
          if (rawText === cleanText) {
            const updatedLi = originalLi.replace('data-checked="true"', 'data-checked="false"')
            newContent = newContent.replace(originalLi, updatedLi)
            break
          }
        }
      }

      await db.note.update({
        where: { id: note.id },
        data: { content: newContent }
      })
    }

    // In-app Notification for member
    if (checkItem?.completedByUserId) {
      try {
        await db.notification.create({
          data: {
            userId: checkItem.completedByUserId,
            type: "TASK_REJECTED",
            title: "Task Revision Requested",
            message: `Your completion of "${cleanText}" in "${note.title}" was not approved by the owner. Please review and redo.`,
            link: `/shared/${note.shareId}`
          }
        })
      } catch (e) {
        console.error("Failed to create in-app notification:", e)
      }
    }

    // Email Notification to all member emails
    for (const email of recipientEmails) {
      try {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background: #ffffff; color: #111;">
            <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px;">
              <h1 style="font-size: 20px; font-weight: 800; color: #111; margin: 0;">TaskOrbit</h1>
              <p style="font-size: 13px; color: #dc2626; font-weight: 700; margin: 4px 0 0;">⚠️ Task Revision Requested</p>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <p style="font-size: 14px; color: #991b1b; margin: 0 0 16px;">
                Your completion of <strong>"${cleanText}"</strong> in <strong>"${note.title}"</strong> was not approved by the owner <strong>(${ownerDisplayName})</strong>.
              </p>
              <p style="font-size: 13px; color: #7f1d1d; margin: 0;">
                The task has been reset to unchecked. Please review and redo the work as requested.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${appUrl}/shared/${note.shareId}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px;">
                View Task List →
              </a>
            </div>
          </div>
        `

        await sendTaskNotificationEmail({
          to: email,
          subject: formatShortTaskSubject("Task Revision Requested ⚠️", cleanText, note.title),
          html
        })
      } catch (e) {
        console.error("Failed to send rejection email:", e)
      }
    }
  }

    return { success: true }
  } catch (error: any) {
    console.error("Error in reviewSharedTaskCompletion:", error)
    return { error: error?.message || "Failed to process task review" }
  }
}

// 5. Add Inline Comment to Task
export async function addTaskComment(shareId: string, taskText: string, content: string) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({
    where: { shareId },
    include: { collaborators: true }
  })

  if (!note) return { error: "Note not found" }
  const isOwner = note.userId === user.id
  const isCollaborator = note.collaborators.some((c) => c.userId === user.id)

  if (!isOwner && !isCollaborator) {
    return { error: "You must be an authorized collaborator to leave comments" }
  }

  const cleanContent = content.trim()
  if (!cleanContent) return { error: "Comment cannot be empty" }

  const comment = await db.taskComment.create({
    data: {
      noteId: note.id,
      taskText: taskText.trim(),
      userId: user.id,
      userName: user.name || user.email || "Collaborator",
      content: cleanContent
    }
  })

  // Notify Owner if comment posted by collaborator
  if (!isOwner) {
    await db.notification.create({
      data: {
        userId: note.userId,
        type: "TASK_COMMENT",
        title: "New Comment on Task",
        message: `${user.name || user.email} commented on "${taskText}": "${cleanContent.substring(0, 50)}..."`,
        link: `/shared/${shareId}`
      }
    })
  }

  return { success: true, comment }
}

// 6. Multi-Company / Folder Workspaces
export async function createCompanyWorkspace(name: string) {
  const user = await getRequireUser()
  const cleanName = name.trim()
  if (!cleanName) return { error: "Company name is required" }

  const company = await db.companyWorkspace.create({
    data: {
      name: cleanName,
      userId: user.id
    }
  })

  return { success: true, company }
}

export async function assignNoteToCompany(noteId: string, companyWorkspaceId: string | null) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({ where: { id: noteId } })
  if (!note || note.userId !== user.id) return { error: "Unauthorized" }

  await db.note.update({
    where: { id: noteId },
    data: { companyWorkspaceId }
  })

  return { success: true }
}

export async function getUserSharedTasksDashboard() {
  const user = await getRequireUser()

  // 1. Fetch user's owned Company Workspaces
  const ownedCompanies = await db.companyWorkspace.findMany({
    where: { userId: user.id },
    include: {
      notes: {
        where: { isPublic: true },
        include: {
          collaborators: { include: { user: { select: { name: true, email: true } } } },
          joinRequests: { where: { status: "PENDING" } },
          checkItems: true,
          comments: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  })

  // 2. Fetch all shared notes owned by user
  const ownedSharedNotes = await db.note.findMany({
    where: { userId: user.id, isPublic: true },
    include: {
      companyWorkspace: true,
      collaborators: { include: { user: { select: { name: true, email: true } } } },
      joinRequests: { where: { status: "PENDING" } },
      checkItems: true,
      comments: true
    },
    orderBy: { updatedAt: "desc" }
  })

  // 3. Fetch notes joined as collaborator
  const joinedCollaborations = await db.taskCollaborator.findMany({
    where: { userId: user.id },
    include: {
      note: {
        include: {
          user: { select: { name: true, email: true } },
          companyWorkspace: true,
          collaborators: { include: { user: { select: { name: true, email: true } } } },
          checkItems: true,
          comments: true
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  })

  const joinedNotes = joinedCollaborations.map((c) => c.note)

  // 4. Fetch company workspaces belonging to owners of joined notes
  const joinedCompanyIds = joinedNotes
    .map((n) => n.companyWorkspaceId)
    .filter((id): id is string => !!id)

  const joinedCompanies = joinedCompanyIds.length > 0
    ? await db.companyWorkspace.findMany({
        where: { id: { in: joinedCompanyIds } },
        include: {
          notes: {
            where: { isPublic: true },
            include: {
              collaborators: { include: { user: { select: { name: true, email: true } } } },
              joinRequests: { where: { status: "PENDING" } },
              checkItems: true,
              comments: true
            }
          }
        }
      })
    : []

  // Combine and deduplicate company workspaces
  const companyMap = new Map<string, any>()
  ownedCompanies.forEach((c) => companyMap.set(c.id, c))
  joinedCompanies.forEach((c) => companyMap.set(c.id, c))
  const companies = Array.from(companyMap.values())

  return {
    companies,
    ownedSharedNotes,
    joinedNotes,
    currentUserId: user.id
  }
}

// 8. Leave a Shared Task (for Collaborators)
export async function leaveSharedTask(shareId: string) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({ where: { shareId } })
  if (!note) return { error: "Task list not found" }
  if (note.userId === user.id) {
    return { error: "Owners cannot leave their own task list. You can disable public sharing in the editor." }
  }

  await db.taskCollaborator.deleteMany({
    where: { noteId: note.id, userId: user.id }
  })

  return { success: true }
}

// 9. Remove Collaborator from Task (for Owner)
export async function removeCollaborator(noteId: string, targetUserId: string) {
  const user = await getRequireUser()

  const note = await db.note.findUnique({ where: { id: noteId } })
  if (!note || note.userId !== user.id) {
    return { error: "Only the owner can remove collaborators" }
  }

  await db.taskCollaborator.deleteMany({
    where: { noteId, userId: targetUserId }
  })

  // Cleanup any join request
  await db.taskJoinRequest.deleteMany({
    where: { noteId, userId: targetUserId }
  })

  return { success: true }
}

// 10. Delete Company Workspace Folder (for Owner)
export async function deleteCompanyWorkspace(companyId: string) {
  const user = await getRequireUser()

  const company = await db.companyWorkspace.findUnique({ where: { id: companyId } })
  if (!company || company.userId !== user.id) {
    return { error: "Only the folder owner can delete this folder" }
  }

  // Unassign notes from this company folder
  await db.note.updateMany({
    where: { companyWorkspaceId: companyId },
    data: { companyWorkspaceId: null }
  })

  // Delete folder
  await db.companyWorkspace.delete({ where: { id: companyId } })

  return { success: true }
}

// 7. Notifications
export async function getNotifications() {
  const user = await getRequireUser()
  return await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  })
}

export async function markNotificationAsRead(id: string) {
  const user = await getRequireUser()
  await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true }
  })
  return { success: true }
}
