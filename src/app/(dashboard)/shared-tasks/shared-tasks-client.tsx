"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Users, 
  FolderPlus, 
  Building2, 
  CheckCircle2, 
  ExternalLink, 
  MessageSquare, 
  UserPlus, 
  FileText,
  Folder,
  Plus,
  Trash2,
  LogOut,
  UserX
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  createCompanyWorkspace, 
  assignNoteToCompany, 
  deleteCompanyWorkspace, 
  leaveSharedTask, 
  removeCollaborator 
} from "@/actions/collaboration"
import { toast } from "sonner"

export function SharedTasksDashboardClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData)
  const [activeTab, setActiveTab] = useState<"ALL" | "OWNED" | "JOINED">("ALL")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | "ALL">("ALL")
  const [newCompanyName, setNewCompanyName] = useState("")
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [movingNoteId, setMovingNoteId] = useState("")
  const [activeMemberModalNote, setActiveMemberModalNote] = useState<any | null>(null)

  const selectedCompany = data.companies.find((c: any) => c.id === selectedCompanyId)

  // Create Company Folder
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return
    setIsCreatingCompany(true)
    try {
      const res = await createCompanyWorkspace(newCompanyName)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Company folder "${newCompanyName}" created!`)
        setData((prev: any) => ({
          ...prev,
          companies: [...prev.companies, { ...res.company, notes: [] }]
        }))
        setSelectedCompanyId(res.company.id)
        setNewCompanyName("")
        setShowCompanyModal(false)
      }
    } catch (err) {
      toast.error("Failed to create company workspace")
    } finally {
      setIsCreatingCompany(false)
    }
  }

  // Delete Company Folder
  const handleDeleteCompany = async (companyId: string, companyName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete folder "${companyName}"? Task lists inside will remain safely in Unassigned.`)) {
      return
    }

    try {
      const res = await deleteCompanyWorkspace(companyId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Folder "${companyName}" deleted!`)
        setData((prev: any) => ({
          ...prev,
          companies: prev.companies.filter((c: any) => c.id !== companyId)
        }))
        if (selectedCompanyId === companyId) {
          setSelectedCompanyId("ALL")
        }
      }
    } catch (e) {
      toast.error("Failed to delete folder")
    }
  }

  // Move Note to Company Folder
  const handleAssignCompany = async (noteId: string, companyWorkspaceId: string) => {
    const targetId = companyWorkspaceId === "NONE" ? null : companyWorkspaceId
    try {
      const res = await assignNoteToCompany(noteId, targetId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Task list moved to folder!")
        window.location.reload()
      }
    } catch (e) {
      toast.error("Failed to update folder")
    }
  }

  // Leave Shared Task (Collaborator)
  const handleLeaveTask = async (shareId: string, noteTitle: string) => {
    if (!confirm(`Are you sure you want to leave "${noteTitle}"? You will lose access until re-invited.`)) {
      return
    }

    try {
      const res = await leaveSharedTask(shareId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("You have left the task list")
        setData((prev: any) => ({
          ...prev,
          joinedNotes: prev.joinedNotes.filter((n: any) => n.shareId !== shareId)
        }))
      }
    } catch (e) {
      toast.error("Failed to leave task list")
    }
  }

  // Remove Collaborator (Owner)
  const handleRemoveCollaborator = async (noteId: string, targetUserId: string, userName: string) => {
    if (!confirm(`Remove ${userName} from this task list?`)) return

    try {
      const res = await removeCollaborator(noteId, targetUserId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`${userName} removed`)
        window.location.reload()
      }
    } catch (e) {
      toast.error("Failed to remove collaborator")
    }
  }

  // 1. All available notes owned + joined
  const allOwnedNotes = data.ownedSharedNotes || []
  const allJoinedNotes = data.joinedNotes || []

  // 2. Filter notes for the selected folder
  const folderOwnedNotes = selectedCompanyId === "ALL"
    ? allOwnedNotes
    : allOwnedNotes.filter((n: any) => n.companyWorkspaceId === selectedCompanyId)

  const folderJoinedNotes = selectedCompanyId === "ALL"
    ? allJoinedNotes
    : allJoinedNotes.filter((n: any) => n.companyWorkspaceId === selectedCompanyId)

  const folderAllNotesMap = new Map<string, any>()
  folderOwnedNotes.forEach((n: any) => folderAllNotesMap.set(n.id, n))
  folderJoinedNotes.forEach((n: any) => folderAllNotesMap.set(n.id, n))
  const folderAllNotes = Array.from(folderAllNotesMap.values())

  // 3. Current active tab notes
  let displayNotes: any[] = []
  if (activeTab === "ALL") {
    displayNotes = folderAllNotes
  } else if (activeTab === "OWNED") {
    displayNotes = folderOwnedNotes
  } else {
    displayNotes = folderJoinedNotes
  }

  const unassignedNotesForSelectedFolder = allOwnedNotes.filter(
    (n: any) => n.companyWorkspaceId !== selectedCompanyId
  )

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Shared Tasks Workspace
          </h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">
            Only notes you have explicitly shared with a team or joined appear here. Personal private notes remain separate in "Notes".
          </p>
        </div>

        <Button 
          onClick={() => setShowCompanyModal(true)}
          className="gap-2 font-semibold shadow-sm self-start md:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          New Company Folder
        </Button>
      </div>

      {/* Company / Folder Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/50">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 shrink-0 flex items-center gap-1">
          <Folder className="w-3.5 h-3.5" /> Folders:
        </span>
        
        <button
          onClick={() => setSelectedCompanyId("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
            selectedCompanyId === "ALL"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          All Workspaces ({allOwnedNotes.length + allJoinedNotes.length})
        </button>

        {data.companies.map((c: any) => {
          const notesCountInFolder = allOwnedNotes.filter((n: any) => n.companyWorkspaceId === c.id).length +
                                    allJoinedNotes.filter((n: any) => n.companyWorkspaceId === c.id).length
          const isFolderOwner = c.userId === data.currentUserId

          return (
            <div key={c.id} className="relative group shrink-0">
              <button
                onClick={() => setSelectedCompanyId(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  selectedCompanyId === c.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {c.name}
                <span className="opacity-75 text-[10px] font-bold">({notesCountInFolder})</span>

                {/* Delete Folder Button for Owner */}
                {isFolderOwner && (
                  <span 
                    onClick={(e) => handleDeleteCompany(c.id, c.name, e)}
                    className="ml-1 text-red-400 hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity p-0.5"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Main Tabs (All, Created by Me, Joined Teams) */}
      <div className="flex items-center gap-4 border-b border-border/40">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "ALL"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Shared Tasks ({folderAllNotes.length})
        </button>
        <button
          onClick={() => setActiveTab("OWNED")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "OWNED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Created by Me ({folderOwnedNotes.length})
        </button>
        <button
          onClick={() => setActiveTab("JOINED")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "JOINED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Joined Teams ({folderJoinedNotes.length})
        </button>
      </div>

      {/* Task Cards Grid or Empty State */}
      {displayNotes.length === 0 ? (
        <Card className="p-10 text-center border-2 border-dashed rounded-2xl bg-card/30 space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground mb-1">
              {selectedCompany ? `No task lists in "${selectedCompany.name}"` : "No shared task lists found"}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {selectedCompany 
                ? `You haven't assigned any shared task list to "${selectedCompany.name}" yet.` 
                : "Create a note, enable public sharing in the editor, and distribute tasks to your team."}
            </p>
          </div>

          {/* Quick Dropdown to Move a Task into this Folder */}
          {selectedCompany && unassignedNotesForSelectedFolder.length > 0 && (
            <div className="max-w-sm mx-auto p-4 rounded-xl bg-card border border-border/80 text-left space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Move a shared task into &ldquo;{selectedCompany.name}&rdquo;:
              </label>
              <div className="flex gap-2">
                <select
                  value={movingNoteId}
                  onChange={(e) => setMovingNoteId(e.target.value)}
                  className="flex-1 text-xs bg-background border border-border/80 rounded-lg px-2.5 py-1.5 outline-none font-medium text-foreground"
                >
                  <option value="">Select a task list...</option>
                  {unassignedNotesForSelectedFolder.map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {n.title || "Untitled"}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="text-xs font-bold"
                  disabled={!movingNoteId}
                  onClick={() => handleAssignCompany(movingNoteId, selectedCompany.id)}
                >
                  Move Here
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/notes">Go to My Notes</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayNotes.map((note: any) => {
            const isOwner = note.userId === data.currentUserId
            const collaboratorsList = note.collaborators || []
            const collaboratorsCount = collaboratorsList.length + 1
            const pendingReqsCount = note.joinRequests?.length || 0
            const completedTaskTexts = new Set<string>()
            note.checkItems?.forEach((item: any) => {
              if (item.status !== "REJECTED") {
                completedTaskTexts.add(item.taskText.trim())
              }
            })
            if (note.content) {
              const regex = /<li([^>]*)>([\s\S]*?)<\/li>/gi
              let match
              while ((match = regex.exec(note.content)) !== null) {
                const attributes = match[1]
                if (attributes.includes('data-checked="true"')) {
                  let rawText = match[2].replace(/<[^>]*>/g, '').trim()
                  if (rawText) completedTaskTexts.add(rawText)
                }
              }
            }
            const completedTasksCount = completedTaskTexts.size
            const commentsCount = note.comments?.length || 0

            return (
              <Card key={note.id} className="flex flex-col bg-card border border-border/80 shadow-sm hover:border-primary/40 transition-all">
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold line-clamp-1">
                      {note.title || "Untitled Task List"}
                    </CardTitle>
                    {isOwner ? (
                      <Badge variant="default" className="text-[10px] font-bold tracking-wider uppercase shrink-0">
                        Owner
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] font-bold tracking-wider uppercase shrink-0">
                        Collaborator
                      </Badge>
                    )}
                  </div>
                  
                  {/* Folder Badge */}
                  {note.companyWorkspace && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{note.companyWorkspace.name}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 space-y-3 pb-3">
                  
                  {/* Stats pills */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button 
                      type="button"
                      onClick={() => setActiveMemberModalNote(note)}
                      className="bg-muted/30 p-2.5 rounded-xl border border-border/40 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors"
                      title="Click to view & manage team members"
                    >
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{collaboratorsCount}</p>
                        <p className="text-[10px] text-muted-foreground">Team Members</p>
                      </div>
                    </button>

                    <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">{completedTasksCount}</p>
                        <p className="text-[10px] text-muted-foreground">Completed Tasks</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending join requests alert for Owner */}
                  {isOwner && pendingReqsCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl text-xs flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" />
                        {pendingReqsCount} pending join request{pendingReqsCount > 1 ? "s" : ""}
                      </span>
                      <Link href={`/shared/${note.shareId}`} target="_blank" className="text-[10px] font-bold uppercase tracking-wider underline">
                        Review
                      </Link>
                    </div>
                  )}

                  {/* Comments counter */}
                  {commentsCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span>{commentsCount} discussion comment{commentsCount > 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {/* Move to Folder Selector (Visible for Owner) */}
                  {isOwner && data.companies.length > 0 && (
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                        <Folder className="w-3 h-3" /> Move to Folder:
                      </span>
                      <select
                        value={note.companyWorkspaceId || "NONE"}
                        onChange={(e) => handleAssignCompany(note.id, e.target.value)}
                        className="text-xs bg-background border border-border/80 rounded-lg px-2.5 py-1.5 outline-none font-bold text-foreground cursor-pointer hover:border-primary transition-colors"
                      >
                        <option value="NONE">Unassigned</option>
                        {data.companies.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            📁 {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  {isOwner ? (
                    <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                      <Link href={`/notes/${note.id}`}>
                        Edit Note
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleLeaveTask(note.shareId, note.title)}
                      className="gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave List
                    </Button>
                  )}

                  <Button asChild size="sm" className="gap-1.5 text-xs font-bold">
                    <Link href={`/shared/${note.shareId}`} target="_blank">
                      View Shared List
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal for Managing Team Members & Removing Users */}
      {activeMemberModalNote && (
        <div 
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveMemberModalNote(null)}
        >
          <Card 
            className="w-full max-w-md shadow-2xl border border-border animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Members - {activeMemberModalNote.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {activeMemberModalNote.userId === data.currentUserId 
                  ? "As owner, you can remove members from this task list." 
                  : "Active collaborators on this shared task list."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-60 overflow-y-auto">
              
              {/* Owner Item */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs">
                <div>
                  <p className="font-bold text-foreground">
                    {activeMemberModalNote.user?.name || activeMemberModalNote.user?.email || "Owner"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{activeMemberModalNote.user?.email}</p>
                </div>
                <Badge variant="default" className="text-[10px] font-bold uppercase">Owner</Badge>
              </div>

              {/* Collaborators List */}
              {activeMemberModalNote.collaborators?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-2">No additional team members joined yet.</p>
              ) : (
                activeMemberModalNote.collaborators?.map((col: any) => (
                  <div key={col.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{col.user?.name || col.user?.email || "Collaborator"}</p>
                      <p className="text-[10px] text-muted-foreground">{col.user?.email}</p>
                    </div>

                    {activeMemberModalNote.userId === data.currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1 font-semibold"
                        onClick={() => handleRemoveCollaborator(
                          activeMemberModalNote.id, 
                          col.userId, 
                          col.user?.name || col.user?.email || "User"
                        )}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))
              )}

            </CardContent>
            <CardFooter className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setActiveMemberModalNote(null)}>
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Modal for creating a new Company Folder */}
      {showCompanyModal && (
        <div 
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCompanyModal(false)}
        >
          <Card 
            className="w-full max-w-md shadow-2xl border border-border animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Create Company Folder
              </CardTitle>
              <CardDescription>
                Group your shared task lists under companies or departments (e.g. Acme Corp, Team A).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateCompany}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Company / Department Name
                  </label>
                  <Input
                    placeholder="e.g. mci, Acme Corp, or Team A"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCompanyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingCompany}>
                  {isCreatingCompany ? "Creating..." : "Create Folder"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

    </div>
  )
}
