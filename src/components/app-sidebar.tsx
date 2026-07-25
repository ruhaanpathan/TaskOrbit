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
  Users,
  Video,
  Sparkles
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
      window.location.href = `/notes/${noteId}`
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
    { name: "Shared Tasks", href: "/shared-tasks", icon: Users },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Archive", href: "/archive", icon: Archive },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full w-full bg-card/80 backdrop-blur-xl border-r border-border/60 text-card-foreground">
      {/* Header Logo */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="bg-primary/10 border border-primary/20 p-2 rounded-xl text-primary shadow-sm">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-extrabold tracking-tight">TaskOrbit</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">AI Workspace</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 space-y-2">
        <Button 
          onClick={handleCreateNote} 
          disabled={isCreating}
          className="w-full justify-start gap-2.5 h-10 shadow-sm font-semibold transition-all hover:scale-[1.01]"
        >
          <PlusCircle className="w-4 h-4" />
          {isCreating ? "Creating..." : "New Note"}
        </Button>

        <Button 
          variant="outline"
          className="w-full justify-start gap-2.5 h-10 font-semibold shadow-sm border-border/80 hover:bg-muted transition-all"
          onClick={() => {
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            window.open(isMobile ? 'https://meet.google.com' : 'https://meet.google.com/new', '_blank')
          }}
        >
          <Video className="w-4 h-4 text-foreground" />
          Start Meeting
        </Button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                isActive 
                  ? "bg-primary/10 text-primary font-bold shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {link.name}
            </Link>
          )
        })}
      </div>

      {/* Footer Profile & Controls */}
      <div className="p-4 mt-auto">
        <Separator className="mb-4 bg-border/40" />
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs text-muted-foreground font-medium truncate w-[140px]" title={userEmail}>
            {userEmail}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-lg"
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
          className="w-full justify-start gap-2 h-9 text-xs border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Hamburger Header */}
      <div className="md:hidden fixed top-0 left-0 w-full h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-extrabold tracking-tight text-sm">TaskOrbit</span>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
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

      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:flex flex-col w-[260px] fixed inset-y-0 z-30">
        <SidebarContent />
      </div>
    </>
  )
}
