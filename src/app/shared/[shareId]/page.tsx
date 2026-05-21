import { db } from "@/lib/db"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Metadata } from "next"
import { FileText } from "lucide-react"

// Strip HTML cleanly for Open Graph descriptions
function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, '').trim()
}

// Generate dynamic Open Graph tags
export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params
  
  const note = await db.note.findUnique({
    where: { shareId }
  })

  if (!note || !note.isPublic) {
    return {
      title: "Note Not Found - TaskOrbit",
    }
  }

  const plainText = stripHtml(note.content || "")
  const description = plainText.length > 160 ? plainText.substring(0, 160) + "..." : plainText

  return {
    title: `${note.title} - TaskOrbit`,
    description,
    openGraph: {
      title: `${note.title} - TaskOrbit`,
      description,
      type: "article",
    }
  }
}

export default async function SharedNotePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  
  // Note: No authentication check here intentionally!
  const note = await db.note.findUnique({
    where: { shareId },
    include: {
      noteTags: {
        include: { tag: true }
      }
    }
  })

  // If note doesn't exist or is set to private
  if (!note || !note.isPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="bg-card border shadow-sm rounded-2xl p-10 max-w-md text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Note Unavailable</h1>
          <p className="text-muted-foreground mb-8">
            This note either doesn't exist, has been deleted, or is no longer shared publicly by its owner.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Return to TaskOrbit</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[720px] mx-auto px-6 py-16 md:py-24">
        <article className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground leading-tight">
            {note.title?.trim() || "Untitled Note"}
          </h1>
          
          {note.noteTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {note.noteTags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="w-full h-px bg-border my-8" />

          {/* Prose container applies Tailwind Typography styles to raw HTML output */}
          <div 
            className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary hover:prose-a:underline prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          <div className="w-full h-px bg-border my-12" />

          <footer className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500/80 animate-pulse" />
              Last updated {formatDistanceToNow(new Date(note.updatedAt))} ago
            </div>
            <div className="font-medium tracking-tight opacity-75 hover:opacity-100 transition-opacity">
              Created with <span className="font-bold text-foreground">TaskOrbit</span>
            </div>
          </footer>
        </article>
      </main>
    </div>
  )
}
