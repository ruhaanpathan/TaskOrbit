import { Editor } from "@tiptap/react"
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus, CheckSquare, Video, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceRecorder } from "./voice-recorder"

interface EditorToolbarProps {
  editor: Editor | null
  onMagicFormat?: () => void
  isFormatting?: boolean
}

const ToolbarButton = ({ 
  isActive, 
  onClick, 
  children 
}: { 
  isActive: boolean, 
  onClick: () => void, 
  children: React.ReactNode 
}) => (
  <Button
    variant="ghost"
    size="icon"
    className={`h-8 w-8 ${isActive ? 'bg-muted text-primary font-bold' : 'text-muted-foreground'}`}
    onClick={onClick}
    type="button"
  >
    {children}
  </Button>
)

export function EditorToolbar({ editor, onMagicFormat, isFormatting }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-card p-2 sticky top-0 z-10 rounded-t-xl shadow-sm">
      <ToolbarButton isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-[1px] h-6 bg-border/60 mx-1" />
      
      <ToolbarButton isActive={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-[1px] h-6 bg-border/60 mx-1" />

      <ToolbarButton isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckSquare className="h-4 w-4" />
      </ToolbarButton>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 ml-1 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 dark:text-blue-400 dark:bg-blue-500/20 dark:hover:bg-blue-500/30"
        onClick={() => {
          if (editor.isActive("taskList")) {
            // Already inside a task list — just insert the meeting prefix text
            editor.chain().focus().insertContent("🎥 Meeting: ").run()
          } else {
            // Not in a task list yet — create a new task item with the prefix
            editor.chain().focus().toggleTaskList().run()
            editor.chain().focus().insertContent("🎥 Meeting: ").run()
          }
        }}
        type="button"
      >
        <Video className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">Schedule</span>
      </Button>

      <VoiceRecorder editor={editor} />

      {/* Magic Format button — always visible, critical for mobile users */}
      {onMagicFormat && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onMagicFormat}
          disabled={isFormatting}
          title="Magic Format — AI will restructure your note"
          className="h-8 gap-1.5 ml-1 text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 dark:text-violet-400 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 transition-all"
        >
          {isFormatting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-semibold">
            {isFormatting ? "Formatting..." : "Magic"}
          </span>
        </Button>
      )}

      <div className="w-[1px] h-6 bg-border/60 mx-1" />

      <ToolbarButton isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton isActive={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}
