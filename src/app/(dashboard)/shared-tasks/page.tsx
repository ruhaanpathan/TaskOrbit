import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUserSharedTasksDashboard } from "@/actions/collaboration"
import { SharedTasksDashboardClient } from "./shared-tasks-client"

export default async function SharedTasksPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const data = await getUserSharedTasksDashboard()

  return <SharedTasksDashboardClient initialData={data} />
}
