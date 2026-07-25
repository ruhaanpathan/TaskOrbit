"use server"

import { auth } from "@/auth"
import { sendFeedbackEmail } from "@/lib/mail"

export async function submitFeedbackAction({
  category,
  subject,
  message,
}: {
  category: string
  subject: string
  message: string
}) {
  const session = await auth()
  const user = session?.user

  if (!category || !subject.trim() || !message.trim()) {
    return { error: "Please fill out all required fields" }
  }

  const senderEmail = user?.email || "anonymous@taskorbit.app"
  const senderName = user?.name || user?.email || "TaskOrbit User"

  const result = await sendFeedbackEmail({
    category,
    subject: subject.trim(),
    message: message.trim(),
    senderEmail,
    senderName,
  })

  if (!result.success) {
    return { error: result.error || "Failed to send feedback" }
  }

  return { success: true }
}
