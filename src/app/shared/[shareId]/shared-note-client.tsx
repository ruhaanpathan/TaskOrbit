"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { 
  Users, 
  CheckCircle2, 
  UserPlus, 
  MessageSquare, 
  Clock, 
  Building2, 
  Send, 
  Check, 
  X, 
  ShieldCheck, 
  Lock, 
  Share2,
  FileText,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  requestJoinTask, 
  respondToJoinRequest, 
  toggleCollaborativeTask, 
  addTaskComment,
  leaveSharedTask
} from "@/actions/collaboration"
import { toast } from "sonner"

export function SharedNoteTaskClient({ initialData, shareId }: { initialData: any; shareId: string }) {
  const [data, setData] = useState(initialData)
  const [requesting, setRequesting] = useState(false)
  const [activeTaskComment, setActiveTaskComment] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  const { note, isOwner, isCollaborator, joinRequestStatus, pendingRequests, currentUserId } = data

  // Handle Join Request
  const handleRequestAccess = async () => {
    setRequesting(true)
    try {
      const res = await requestJoinTask(shareId)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Request sent to the owner for approval!")
        setData((prev: any) => ({ ...prev, joinRequestStatus: "PENDING" }))
      }
    } catch (e) {
      toast.error("Failed to send request")
    } finally {
      setRequesting(false)
    }
  }

  // Handle Owner Accepting/Rejecting Requests
  const handleRespondRequest = async (requestId: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      const res = await respondToJoinRequest(requestId, status)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(`Request ${status.toLowerCase()}!`)
        setData((prev: any) => ({
          ...prev,
          pendingRequests: prev.pendingRequests.filter((r: any) => r.id !== requestId)
        }))
      }
    } catch (e) {
      toast.error("Failed to respond to request")
    }
  }

  const tasks = initialData.parsedTasks || []

  // Toggle Task Completion with Attribution
  const handleToggleTask = async (taskText: string, currentCompleted: boolean) => {
    if (!isCollaborator) {
      toast.error("You must be an authorized collaborator to check tasks")
      return
    }

    const nextCompleted = !currentCompleted
    try {
      const res = await toggleCollaborativeTask(shareId, taskText, nextCompleted)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(nextCompleted ? "Task completed!" : "Task unchecked")
        // Refresh page data
        window.location.reload()
      }
    } catch (e) {
      toast.error("Failed to update task")
    }
  }

  // Submit Comment
  const handleAddComment = async (taskText: string) => {
    if (!newCommentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await addTaskComment(shareId, taskText, newCommentText)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Comment added!")
        setData((prev: any) => ({
          ...prev,
          note: {
            ...prev.note,
            comments: [...prev.note.comments, res.comment]
          }
        }))
        setNewCommentText("")
      }
    } catch (e) {
      toast.error("Failed to post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      
      {/* Top Banner & Header Navigation */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[800px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-bold gap-1 border-primary/30 text-primary">
              <Users className="w-3 h-3" /> Shared Task List
            </Badge>
            {note.companyWorkspace && (
              <Badge variant="secondary" className="text-xs font-semibold gap-1">
                <Building2 className="w-3 h-3" /> {note.companyWorkspace.name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCollaborator && !isOwner && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={async () => {
                  if (confirm("Are you sure you want to leave this task list?")) {
                    const res = await leaveSharedTask(shareId)
                    if (res.error) toast.error(res.error)
                    else {
                      toast.success("Left task list")
                      window.location.href = "/shared-tasks"
                    }
                  }
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave List
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-medium"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success("Share link copied to clipboard!")
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Link
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-10 space-y-8">
        
        {/* Title & Metadata */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            {note.title || "Untitled Task List"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Created by <strong className="text-foreground">{note.user.name || note.user.email}</strong></span>
            <span>•</span>
            <span>{note.collaborators.length + 1} active member{note.collaborators.length !== 0 ? "s" : ""}</span>
            <span>•</span>
            <span>Updated {formatDistanceToNow(new Date(note.updatedAt))} ago</span>
          </div>
        </div>

        {/* ── Access Control & HR Approval Banner ── */}
        {!currentUserId ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Want to collaborate on this task list?</p>
                <p className="text-xs text-muted-foreground">Sign in to request access from the owner to check tasks and add comments.</p>
              </div>
              <Button asChild size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !isCollaborator ? (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Team Collaboration Access</p>
                <p className="text-xs text-muted-foreground">
                  {joinRequestStatus === "PENDING"
                    ? "Your join request has been sent to the owner. Waiting for approval..."
                    : "Send a request to the owner to join this task list."}
                </p>
              </div>

              {joinRequestStatus === "PENDING" ? (
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 font-bold py-1 px-3">
                  <Clock className="w-3.5 h-3.5" /> Request Pending
                </Badge>
              ) : (
                <Button size="sm" onClick={handleRequestAccess} disabled={requesting} className="gap-1.5 font-semibold">
                  <UserPlus className="w-4 h-4" />
                  {requesting ? "Sending..." : "Request Access to Join"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* ── HR / Owner Pending Approvals Panel ── */}
        {isOwner && pendingRequests.length > 0 && (
          <Card className="border-primary/40 shadow-sm">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-primary">
                  <UserPlus className="w-4 h-4" />
                  Pending Join Requests ({pendingRequests.length})
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Owner Approval Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 text-xs">
                  <div>
                    <p className="font-bold text-foreground">{req.user.name || "Team Member"}</p>
                    <p className="text-[11px] text-muted-foreground">{req.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 text-xs text-red-600 hover:bg-red-500/10 border-red-500/30"
                      onClick={() => handleRespondRequest(req.id, "REJECTED")}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 gap-1 text-xs font-bold"
                      onClick={() => handleRespondRequest(req.id, "ACCEPTED")}
                    >
                      <Check className="w-3.5 h-3.5" /> Accept & Authorize
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Task Items & GitHub-Style Attribution List ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Tasks & Action Items
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {note.checkItems.length} completed
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              No task items found in this note.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, idx) => {
                const completion = note.checkItems.find((c: any) => c.taskText === task.text)
                const isChecked = !!completion || task.isChecked
                const commentsForTask = note.comments.filter((c: any) => c.taskText === task.text)

                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isChecked 
                        ? "bg-muted/20 border-border/40 opacity-90" 
                        : "bg-card border-border/80 hover:border-primary/40 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Checkbox & Task Text */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.text, isChecked)}
                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="space-y-1 flex-1">
                          <p className={`text-sm font-medium leading-normal ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.text}
                          </p>

                          {/* GitHub-style Attribution Badge */}
                          {completion && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium pt-1">
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3" /> Completed by {completion.completedByName}
                              </span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(completion.completedAt))} ago</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Comment Toggle Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 gap-1.5 text-xs font-semibold shrink-0 ${
                          commentsForTask.length > 0 ? "text-primary bg-primary/10" : "text-muted-foreground"
                        }`}
                        onClick={() => setActiveTaskComment(activeTaskComment === task.text ? null : task.text)}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{commentsForTask.length}</span>
                      </Button>
                    </div>

                    {/* Inline Task Discussion Drawer */}
                    {activeTaskComment === task.text && (
                      <div className="mt-4 pt-3 border-t border-border/50 space-y-3 animate-in fade-in">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Task Comments & Discussion ({commentsForTask.length})
                        </p>

                        {/* Comment List */}
                        {commentsForTask.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-1">No comments yet. Be the first to comment!</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {commentsForTask.map((c: any) => (
                              <div key={c.id} className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 border border-border/30">
                                <div className="flex items-center justify-between text-muted-foreground font-medium">
                                  <strong className="text-foreground">{c.userName}</strong>
                                  <span className="text-[10px]">{formatDistanceToNow(new Date(c.createdAt))} ago</span>
                                </div>
                                <p className="text-foreground">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment Input */}
                        {isCollaborator ? (
                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Write a comment on this task..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              className="text-xs h-9"
                              onKeyDown={(e) => e.key === "Enter" && handleAddComment(task.text)}
                            />
                            <Button 
                              size="sm" 
                              className="h-9 px-3 gap-1 shrink-0 font-semibold"
                              onClick={() => handleAddComment(task.text)}
                              disabled={submittingComment || !newCommentText.trim()}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Post
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Only authorized collaborators can post comments.</p>
                        )}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
