import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

  // Strip markdown/html from content for preview
  const plainTextContent = note.content.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').trim()
  const preview = plainTextContent.length > 100 
    ? plainTextContent.substring(0, 100) + "..."
    : plainTextContent || "Empty note"

  return (
    <Link href={`/notes/${note.id}`} className="block group h-full">
      <Card className="h-full flex flex-col transition-all hover:border-primary/50 hover:shadow-md cursor-pointer bg-card/50 hover:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">
            {note.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
            {preview}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 pt-0">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 font-normal text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="px-2 font-normal text-xs text-muted-foreground">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div className="text-xs text-muted-foreground/60 font-medium">
            Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
