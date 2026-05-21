import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SearchBar } from "@/components/search/search-bar"
import { ReminderSystem } from "@/components/reminder-system"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ReminderSystem userId={session.user.id as string} />
      <AppSidebar 
        userId={session.user.id as string} 
        userEmail={session.user.email as string} 
      />
      <main className="flex-1 md:ml-[260px] p-6 pt-20 md:pt-10 overflow-x-hidden min-h-screen max-w-7xl mx-auto w-full">
        <SearchBar />
        {children}
      </main>
    </div>
  )
}
