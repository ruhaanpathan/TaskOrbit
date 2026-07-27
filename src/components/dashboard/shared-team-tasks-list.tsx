"use client"

import { useState } from "react"
import { Check, X, FileText, Loader2, ExternalLink, Clock, UserCheck, CheckCircle2, Building2, User } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { reviewSharedTaskCompletion, toggleCollaborativeTask } from "@/actions/collaboration"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export type SharedDashboardTask = {
  noteId: string
  shareId: string
  noteTitle: string
  text: string
  checkItemId?: string
  completedByName?: string
  completedAt?: Date
  isCompletedByMember?: boolean
  isOwner?: boolean
  ownerName?: string
  companyFolderName?: string
}

export function SharedTeamTasksDashboardList({ initialTasks }: { initialTasks: SharedDashboardTask[] }) {
  const [tasks, setTasks] = useState<SharedDashboardTask[]>(initialTasks)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [togglingTaskText, setTogglingTaskText] = useState<string | null>(null)

  // Handle checking off a task directly from the Dashboard
  const handleToggleTaskFromDashboard = async (task: SharedDashboardTask, index: number) => {
    const isCurrentlyChecked = !!task.isCompletedByMember
    if (isCurrentlyChecked && !task.isOwner) {
      toast.error("Only the task owner can uncheck completed tasks")
      return
    }

    const nextChecked = !isCurrentlyChecked
    setTogglingTaskText(task.text)

    try {
      const res = await toggleCollaborativeTask(task.shareId, task.text, nextChecked)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(nextChecked ? "Task marked complete! Sent to owner for review." : "Task unchecked")
        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === index
              ? {
                  ...t,
                  isCompletedByMember: nextChecked,
                  completedByName: nextChecked ? (res.checkItem?.completedByName || "You") : undefined,
                  completedAt: nextChecked ? new Date() : undefined,
                  checkItemId: res.checkItem?.id || t.checkItemId
                }
              : t
          )
        )
      }
    } catch (e) {
      toast.error("Failed to update task")
    } finally {
      setTogglingTaskText(null)
    }
  }

  // Handle Owner Approving or Rejecting task completion
  const handleReview = async (checkItemId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(checkItemId)
    try {
      const res = await reviewSharedTaskCompletion(checkItemId, action)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(action === "APPROVE" ? "Task approved!" : "Task completion rejected")
        // Remove reviewed item from dashboard list
        setTasks((prev) => prev.filter((t) => t.checkItemId !== checkItemId))
      }
    } catch (e) {
      toast.error("Failed to review task")
    } finally {
      setProcessingId(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        No active shared tasks pending review!
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {tasks.map((task, i) => {
        const isChecked = !!task.isCompletedByMember

        return (
          <div 
            key={`${task.noteId}-${i}`} 
            className="p-4 sm:px-6 hover:bg-muted/30 transition-colors flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between gap-4">
              
              {/* Checkbox & Task Text */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleTaskFromDashboard(task, i)}
                  disabled={togglingTaskText === task.text}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border/80 hover:border-primary"
                  }`}
                  title={isChecked ? "Uncheck task" : "Check off task"}
                >
                  {togglingTaskText === task.text ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isChecked ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : null}
                </button>

                <div className="space-y-1 flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.text}
                  </p>

                  {/* Completion Attribution Badge */}
                  {isChecked && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-md">
                        <UserCheck className="w-3 h-3" /> Done by {task.completedByName || "Team Member"}
                      </span>
                      {task.completedAt && (
                        <span className="text-muted-foreground font-medium">
                          • {formatDistanceToNow(new Date(task.completedAt))} ago
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Note Title & Owner / Folder Info Link */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Link 
                  href={`/shared/${task.shareId}`} 
                  target="_blank"
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[130px] sm:max-w-[170px]">{task.noteTitle}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                {/* Owner Name & Folder Name Badges */}
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  {task.companyFolderName && (
                    <span className="inline-flex items-center gap-1 text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                      <Building2 className="w-2.5 h-2.5" /> {task.companyFolderName}
                    </span>
                  )}

                  {task.ownerName && (
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                      <User className="w-2.5 h-2.5 opacity-70" /> by {task.ownerName}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Owner Review Controls (Accept / Reject) */}
            {isChecked && task.checkItemId && task.isOwner && (
              <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border/80 text-xs mt-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Owner Review Required:
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={processingId === task.checkItemId}
                    onClick={() => handleReview(task.checkItemId!, "REJECT")}
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </Button>

                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 font-bold bg-green-600 hover:bg-green-700 text-white"
                    disabled={processingId === task.checkItemId}
                    onClick={() => handleReview(task.checkItemId!, "APPROVE")}
                  >
                    {processingId === task.checkItemId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    Approve ✓
                  </Button>
                </div>
              </div>
            )}

          </div>
        )
      })}
    </div>
  )
}
