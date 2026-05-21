"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Typography from "@tiptap/extension-typography"
import CharacterCount from "@tiptap/extension-character-count"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { EditorToolbar } from "./editor-toolbar"
import { updateNote, addTagToNote, removeTagFromNote, toggleNotePublic, deleteNote, updateAiLogActionItems } from "@/lib/actions/notes"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Wand2, Loader2, Save, Trash2, Globe, Lock, Clock, Plus, X, Video, Calendar, CheckSquare, ChevronLeft, ChevronRight, Copy, Sparkles, Archive, ArchiveRestore } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { magicFormatNote } from "@/lib/actions/notes"
import { archiveNote, unarchiveNote } from "@/lib/actions/notes"

interface NoteEditorProps {
  note: {
    id: string
    title: string
    content: string
    isPublic: boolean
    isArchived: boolean
    shareId: string | null
    noteTags: { tag: { id: string; name: string } }[]
    aiLogs?: {
      id: string
      summary: string
      actionItems: string
      suggestedTitle: string
      suggestedTags: string
      createdAt: Date
    }[]
  }
  userId: string
}

export function NoteEditor({ note, userId }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [currentText, setCurrentText] = useState(note.content || "")
  const [isPublic, setIsPublic] = useState(note.isPublic)
  // Store shareId in state so it's always in sync with what the DB returns
  const [shareId, setShareId] = useState<string | null>(note.shareId)
  const [saveStatus, setSaveStatus] = useState<"Saved ✓" | "Saving..." | "">("")
  const [newTag, setNewTag] = useState("")
  const [isFormatting, setIsFormatting] = useState(false)
  const router = useRouter()

  // AI State
  type AiInsightType = {
    id?: string;
    summary: string;
    actionItems: { text: string; completed: boolean }[];
    suggestedTitle: string;
    suggestedTags: string[];
    createdAt: Date;
  };

  const [aiHistory, setAiHistory] = useState<AiInsightType[]>(
    (note.aiLogs || []).map(log => ({
      id: log.id,
      summary: log.summary,
      actionItems: JSON.parse(log.actionItems || "[]").map((item: any) => 
        typeof item === 'string' ? { text: item, completed: false } : item
      ),
      suggestedTitle: log.suggestedTitle,
      suggestedTags: [], // Not saved to DB
      createdAt: new Date(log.createdAt)
    }))
  )
  
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  
  const aiInsights = aiHistory[historyIndex] || null
  const lastGenerated = aiInsights?.createdAt || null

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({ placeholder: "Start typing your thoughts here..." }),
      CharacterCount,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: "prose prose-zinc dark:prose-invert max-w-none min-h-[400px] p-6 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("Saving...")
      setCurrentText(editor.getText())
      triggerSave(title, editor.getHTML())
    },
  })

  // Handle manual title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    triggerSave(e.target.value, editor?.getHTML() || "")
  }

  const handleMagicFormat = async () => {
    if (!editor || isFormatting) return;
    
    setIsFormatting(true)
    const rawText = editor.getText()
    const toastId = toast.loading("✨ Magic Formatting...")
    try {
      const { html: formattedHtml, title: suggestedTitle } = await magicFormatNote(rawText)
      editor.commands.setContent(formattedHtml)
      if (suggestedTitle) {
        setTitle(suggestedTitle)
        triggerSave(suggestedTitle, formattedHtml)
      }
      toast.success("Note perfectly structured!", { id: toastId })
    } catch (err) {
      toast.error("Failed to magic format note.", { id: toastId })
    } finally {
      setIsFormatting(false)
    }
  }

  // Auto-save logic
  const triggerSave = useCallback((newTitle: string, newContent: string) => {
    setSaveStatus("Saving...")
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    typingTimeoutRef.current = setTimeout(async () => {
      await updateNote(note.id, userId, { title: newTitle, content: newContent })
      setSaveStatus("Saved ✓")
      
      setTimeout(() => setSaveStatus(""), 2000)
    }, 1000)
  }, [note.id, userId])

  // Tags logic
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTag.trim()) return
    
    await addTagToNote(note.id, newTag, userId)
    setNewTag("")
    toast.success(`Tag added`)
  }

  const handleRemoveTag = async (tagId: string) => {
    await removeTagFromNote(note.id, tagId)
    toast.success(`Tag removed`)
  }

  // Share logic
  const handleTogglePublic = async () => {
    const newState = !isPublic
    setIsPublic(newState)
    const result = await toggleNotePublic(note.id, userId, newState)
    // Update shareId from the DB response so Copy Link is never broken
    if (result?.shareId) {
      setShareId(result.shareId)
    }
    toast.success(newState ? "Note is now public" : "Note is now private")
  }

  const copyShareLink = () => {
    if (!shareId) {
      toast.error("Share link is not available yet. Please toggle public sharing again.")
      return
    }
    const url = `${window.location.origin}/shared/${shareId}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard!")
  }

  // AI Logic
  const handleGenerateInsights = async () => {
    setIsGeneratingAi(true)
    try {
      const res = await fetch(`/api/notes/${note.id}/generate-insights`, {
        method: "POST"
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate insights")
      }

      setAiHistory(prev => [
        {
          id: data.logId,
          summary: data.summary,
          actionItems: (data.actionItems || []).map((text: string) => ({ text, completed: false })),
          suggestedTitle: data.suggestedTitle,
          suggestedTags: data.suggestedTags || [],
          createdAt: new Date()
        },
        ...prev
      ])
      setHistoryIndex(0)
      toast.success("Insights generated successfully!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const applySuggestedTitle = () => {
    if (aiInsights?.suggestedTitle) {
      setTitle(aiInsights.suggestedTitle)
      triggerSave(aiInsights.suggestedTitle, editor?.getHTML() || "")
      toast.success("Title updated!")
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Ctrl+S for manual save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        triggerSave(title, editor?.getHTML() || "")
        toast.success("Note saved manually")
      }
      
      // Cmd+Shift+I or Ctrl+Shift+I for AI Generation
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault()
        handleGenerateInsights()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [title, editor, handleGenerateInsights, triggerSave])

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-500">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <Input 
            value={title}
            onChange={handleTitleChange}
            className="text-4xl font-extrabold border-none shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent hover:bg-muted/30 transition-colors rounded-md py-1"
            placeholder="Note Title"
          />
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-muted-foreground min-w-[60px] text-right mr-2">
              {saveStatus}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 hidden sm:flex"
              onClick={() => {
                triggerSave(title, editor?.getHTML() || "")
                toast.success("Note saved manually")
              }}
            >
              <Save className="w-4 h-4" />
              Save <kbd className="ml-1 text-[10px] font-mono opacity-50 border rounded px-1 tracking-tighter bg-muted">⌘S</kbd>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 sm:hidden"
              onClick={() => {
                triggerSave(title, editor?.getHTML() || "")
                toast.success("Note saved manually")
              }}
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Smart Contextual Actions */}
        {(() => {
          const fullContent = (title + " " + currentText).toLowerCase()
          const hasMeeting = fullContent.includes('meet') || fullContent.includes('call') || fullContent.includes('zoom')
          const hasCalendar = fullContent.includes('calendar') || fullContent.includes('schedule')
          const hasTodo = fullContent.includes('todo') || fullContent.includes('task') || fullContent.includes('deadline')

          if (!hasMeeting && !hasCalendar && !hasTodo) return null;

          return (
            <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
              {hasMeeting && (
                <Button size="sm" variant="secondary" className="gap-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30" onClick={() => window.open('https://meet.google.com/new', '_blank')}>
                  <Video className="w-4 h-4" /> Start Meeting
                </Button>
              )}
              {hasCalendar && (
                <Button size="sm" variant="secondary" className="gap-2 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/30" asChild>
                  <Link href="/calendar"><Calendar className="w-4 h-4" /> Open Calendar</Link>
                </Button>
              )}
              {hasTodo && (
                <Button size="sm" variant="secondary" className="gap-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30" asChild>
                  <Link href="/dashboard"><CheckSquare className="w-4 h-4" /> Pending Tasks</Link>
                </Button>
              )}
            </div>
          )
        })()}

        <div className="border rounded-xl shadow-sm bg-card overflow-hidden flex-1 flex flex-col min-h-[500px] relative">
          {isFormatting && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="font-medium text-primary animate-pulse text-sm tracking-tight">AI is formatting your notes...</p>
            </div>
          )}
          <EditorToolbar editor={editor} />
          <div 
            className="flex-1 overflow-y-auto cursor-text bg-background focus:outline-none" 
            onClick={() => editor?.commands.focus()}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "'") {
                e.preventDefault()
                handleMagicFormat()
              }
            }}
          >
            <EditorContent editor={editor} />
          </div>
          <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              Tiptap Editor Active
              <Badge variant="secondary" className="text-[9px] px-1 font-mono tracking-tighter opacity-70 flex items-center gap-1" title="Magic Format">
                Ctrl + ' <Sparkles className="w-2.5 h-2.5" />
              </Badge>
            </span>
            <span>
              {editor?.storage.characterCount.characters()} characters • {editor?.storage.characterCount.words()} words
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[280px] flex flex-col gap-6 shrink-0 pt-2 lg:pt-14">
        
        {/* Tags Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {note.noteTags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No tags added.</span>
              )}
              {note.noteTags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary" className="pr-1 gap-1">
                  {tag.name}
                  <button 
                    onClick={() => handleRemoveTag(tag.id)}
                    className="hover:bg-muted rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <Input 
                size={1}
                placeholder="Add a tag..." 
                className="h-8 text-xs bg-background" 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Panel */}
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!aiInsights && !isGeneratingAi && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate summaries, action items, and titles based on your notes content.
              </p>
            )}

            {isGeneratingAi ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground animate-in fade-in">
                <Loader2 className="w-6 h-6 animate-spin mb-3 text-primary" />
                <span className="text-xs font-medium">Analyzing your note...</span>
              </div>
            ) : (
              aiInsights && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary tracking-tight">SUGGESTED TITLE</span>
                      <Button variant="ghost" size="sm" onClick={applySuggestedTitle} className="h-6 text-[10px] px-2 bg-primary/10 hover:bg-primary/20 text-primary">
                        Apply
                      </Button>
                    </div>
                    <p className="text-xs font-medium bg-background border rounded p-2 text-foreground/90">{aiInsights.suggestedTitle}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-primary tracking-tight">SUMMARY</span>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-background border rounded p-2">
                      {aiInsights.summary}
                    </p>
                  </div>

                  {aiInsights.actionItems.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-primary tracking-tight">ACTION ITEMS</span>
                      <ul className="space-y-1 bg-background border rounded p-2">
                        {aiInsights.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <input 
                              type="checkbox" 
                              className="mt-[3px] rounded-sm border-primary cursor-pointer" 
                              checked={item.completed}
                              onChange={async (e) => {
                                const newChecked = e.target.checked
                                
                                // Optimistically update state
                                setAiHistory(prev => {
                                  const newHistory = [...prev]
                                  const currentLog = { ...newHistory[historyIndex] }
                                  const newItems = [...currentLog.actionItems]
                                  newItems[i] = { ...newItems[i], completed: newChecked }
                                  currentLog.actionItems = newItems
                                  newHistory[historyIndex] = currentLog
                                  return newHistory
                                })
                                
                                // Save to DB if we have an ID
                                if (aiInsights.id) {
                                  const newItems = [...aiInsights.actionItems]
                                  newItems[i] = { ...newItems[i], completed: newChecked }
                                  await updateAiLogActionItems(aiInsights.id, newItems)
                                }
                              }}
                            />
                            <span className={`leading-tight transition-all duration-300 ${item.completed ? 'line-through opacity-50' : ''}`}>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiInsights.suggestedTags && aiInsights.suggestedTags.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-primary tracking-tight">SUGGESTED TAGS</span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiInsights.suggestedTags.map((tag) => {
                          const isAlreadyAdded = note.noteTags.some(nt => nt.tag.name.toLowerCase() === tag.toLowerCase())
                          return (
                            <Badge 
                              key={tag} 
                              variant={isAlreadyAdded ? "secondary" : "outline"} 
                              className={`text-[10px] ${isAlreadyAdded ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-primary/10 hover:border-primary'} transition-colors`}
                              onClick={async () => {
                                if (isAlreadyAdded) return
                                await addTagToNote(note.id, tag, userId)
                                toast.success(`Tag "${tag}" added!`)
                              }}
                            >
                              {isAlreadyAdded ? '✓ ' : '+ '}{tag}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                    <div className="flex gap-1 items-center bg-background border rounded-md p-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 rounded-sm" 
                        disabled={historyIndex === aiHistory.length - 1} 
                        onClick={() => setHistoryIndex(p => p + 1)}
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <span className="text-[9px] font-medium text-muted-foreground w-10 text-center select-none">
                        {aiHistory.length - historyIndex} / {aiHistory.length}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 rounded-sm" 
                        disabled={historyIndex === 0} 
                        onClick={() => setHistoryIndex(p => p - 1)}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                    {lastGenerated && (
                      <p className="text-[10px] text-muted-foreground/60 italic">
                        {formatDistanceToNow(lastGenerated, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            <Button 
              className="w-full text-xs h-8 shadow-sm transition-all flex items-center justify-between px-3 group" 
              variant={aiInsights ? "outline" : "default"} 
              onClick={handleGenerateInsights}
              disabled={isGeneratingAi}
            >
              <span>{isGeneratingAi ? "Generating..." : aiInsights ? "Regenerate Insights" : "Generate Insights"}</span>
              <kbd className="hidden sm:inline-flex font-mono items-center gap-1 text-[10px] opacity-60 border border-current/20 rounded px-1 py-0 tracking-tighter group-hover:opacity-100 transition-opacity">⌘⇧I</kbd>
            </Button>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Public Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant={isPublic ? "default" : "outline"}
              className="w-full text-xs h-9 gap-2 justify-start transition-colors"
              onClick={handleTogglePublic}
            >
              {isPublic ? (
                <><Globe className="w-4 h-4" /> Public (Live)</>
              ) : (
                <><Lock className="w-4 h-4" /> Private</>
              )}
            </Button>
            
            {isPublic && (
              <Button 
                variant="secondary" 
                className="w-full text-xs h-9 gap-2 shadow-sm animate-in fade-in slide-in-from-top-1"
                onClick={copyShareLink}
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                Copy Link
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <div className="pt-4 border-t mt-auto space-y-2">
          {note.isArchived ? (
            <Button 
              variant="outline" 
              className="w-full text-xs h-9 gap-2"
              onClick={async () => {
                await unarchiveNote(note.id, userId)
                toast.success("Note restored from archive")
                router.push("/notes")
              }}
            >
              <ArchiveRestore className="w-4 h-4" />
              Restore Note
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="w-full text-xs h-9 gap-2 text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await archiveNote(note.id, userId)
                toast.success("Note archived")
                router.push("/archive")
              }}
            >
              <Archive className="w-4 h-4" />
              Archive Note
            </Button>
          )}

          <Button 
            variant="ghost" 
            className="w-full text-xs h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              if (confirm("Are you sure you want to permanently delete this note? This action cannot be undone.")) {
                await deleteNote(note.id, userId)
                toast.success("Note deleted")
                router.push("/notes")
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Note
          </Button>
        </div>

      </div>
    </div>
  )
}
