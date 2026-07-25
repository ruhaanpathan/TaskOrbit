import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tag as TagIcon, Clock, FileText } from "lucide-react"

interface NoteCardProps {
  note: {
    id: string
    title: string
    content: string
    updatedAt: Date
    noteTags?: { tag: { name: string } }[]
  }
}

export function NoteCard({ note }: NoteCardProps) {
  const tags = note.noteTags?.map(nt => nt.tag.name) || []

  // Strip markdown/html from content for clean preview
  const plainTextContent = note.content.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').trim()
  const preview = plainTextContent.length > 110 
    ? plainTextContent.substring(0, 110) + "..."
    : plainTextContent || "Empty note"

  return (
    <Link href={`/notes/${note.id}`} className="block group h-full">
      <Card className="h-full flex flex-col transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card/60 backdrop-blur-md border border-border/60">
        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
          <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1 flex-1 pr-2">
            {note.title || "Untitled Note"}
          </CardTitle>
          <FileText className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
        </CardHeader>
        
        <CardContent className="flex-1 pb-3">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {preview}
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col items-start gap-3 pt-0 border-t border-border/30 mt-auto pt-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 w-full">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-0.5 font-medium text-[11px] gap-1 bg-secondary/80 text-secondary-foreground">
                  <TagIcon className="w-2.5 h-2.5 opacity-70" />
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium w-full">
            <Clock className="w-3 h-3 text-muted-foreground/50" />
            <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
