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
      <main className="flex-1 md:ml-[260px] p-4 sm:p-6 lg:p-8 pt-20 md:pt-8 overflow-x-hidden min-h-screen w-full flex flex-col transition-all">
        <div className="w-full flex flex-col gap-6 flex-1">
          <SearchBar />
          {children}
        </div>

        {/* Footer */}
        <footer className="w-full border-t border-border/40 pt-6 mt-12 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <span>Designed & Built by</span>
            <a 
              href="https://github.com/ruhaanpathan" 
              target="_blank" 
              rel="noreferrer" 
              className="font-bold text-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Ruhaan Pathan
            </a>
          </div>

          <div className="flex items-center gap-4">
            <span>TaskOrbit AI Workspace</span>
            <span>•</span>
            <a 
              href="https://github.com/ruhaanpathan" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-foreground transition-colors"
            >
              GitHub @ruhaanpathan
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
