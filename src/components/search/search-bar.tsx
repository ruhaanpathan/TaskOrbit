"use client"

import * as React from "react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { Search, FileText, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useDebounce } from "use-debounce"

export function SearchBar() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery] = useDebounce(query, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/notes/search?q=${encodeURIComponent(debouncedQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [debouncedQuery])

  return (
    <>
      {/* Mobile/Desktop Search Trigger Button */}
      <div className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="w-full md:w-96 flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-colors group"
        >
          <Search className="w-4 h-4 group-hover:text-foreground transition-colors" />
          <span>Search notes...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 hidden sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Search Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <Command className="w-full flex flex-col" shouldFilter={false}>
          <div className="flex items-center border-b px-4 py-1">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <Command.Input 
              autoFocus
              placeholder="Search notes... (Cmd/Ctrl + K)" 
              value={query}
              onValueChange={setQuery}
              className="w-full bg-transparent p-4 outline-none text-foreground placeholder:text-muted-foreground font-medium"
            />
            {loading && <span className="text-xs text-muted-foreground animate-pulse">Searching...</span>}
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {!loading && debouncedQuery && results.length === 0 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No notes found matching "{debouncedQuery}".
              </Command.Empty>
            )}
            {results.map((note) => (
              <Command.Item
                key={note.id}
                onSelect={() => {
                  router.push(`/notes/${note.id}`)
                  setOpen(false)
                }}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 aria-selected:bg-muted transition-colors"
              >
                <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{note.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {note.noteTags.map(({ tag }: any) => (
                      <span key={tag.id} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm font-medium">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(new Date(note.updatedAt))} ago
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
    )}
    </>
  )
}
