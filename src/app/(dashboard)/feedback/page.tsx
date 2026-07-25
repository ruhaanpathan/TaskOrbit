import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FeedbackPageClient } from "./feedback-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Feedback - TaskOrbit",
  description: "Send feedback directly to the TaskOrbit team.",
}

export default async function FeedbackPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userEmail = session.user.email || "user@taskorbit.app"

  return <FeedbackPageClient userEmail={userEmail} />
}
