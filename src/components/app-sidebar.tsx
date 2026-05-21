"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  LayoutDashboard, 
  Archive, 
  LogOut, 
  Sun, 
  Moon,
  Menu, 
  X,
  PlusCircle,
  BookOpen,
  Calendar,
  Video
} from "lucide-react"
import { createNote } from "@/lib/actions/notes"

interface AppSidebarProps {
  userId: string
  userEmail: string
}

export function AppSidebar({ userId, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateNote = async () => {
    setIsCreating(true)
    try {
      const noteId = await createNote(userId)
      window.location.href = `/notes/${noteId}` // Use window.location to force a full refresh if needed, or router.push
    } catch (e) {
      console.error(e)
    } finally {
      setIsCreating(false)
      setIsOpen(false)
    }
  }

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Notes", href: "/notes", icon: FileText },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Archive", href: "/archive", icon: Archive },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full w-full bg-card border-r border-border/50 text-card-foreground">
      {/* Header Logo */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight">TaskOrbit</span>
      </div>

      <div className="px-4 py-2 space-y-2">
        <Button 
          onClick={handleCreateNote} 
          disabled={isCreating}
          className="w-full justify-start gap-2 h-10 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          {isCreating ? "Creating..." : "New Note"}
        </Button>
        <Button 
          variant="secondary"
          className="w-full justify-start gap-2 h-10 shadow-sm bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
          onClick={() => window.open('https://meet.google.com/new', '_blank')}
        >
          <Video className="w-4 h-4" />
          Start Meeting
        </Button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.name}
            </Link>
          )
        })}
      </div>

      <div className="p-4 mt-auto">
        <Separator className="mb-4 bg-border/50" />
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-xs text-muted-foreground truncate w-[140px]" title={userEmail}>
            {userEmail}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        <Button 
          variant="outline" 
          onClick={() => signOut({ callbackUrl: "/login" })} 
          className="w-full justify-start gap-2 h-9 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="md:hidden fixed top-0 left-0 w-full h-14 bg-background/80 backdrop-blur-md border-b z-40 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
        <span className="ml-4 font-bold tracking-tight">TaskOrbit Workspace</span>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 w-64 shadow-2xl animate-in slide-in-from-left-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-50">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-[260px] fixed inset-y-0 z-30">
        <SidebarContent />
      </div>
    </>
  )
}
