"use client"

import * as React from "react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { Search, FileText, Clock, X, Tag, ArrowRight, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useDebounce } from "use-debounce"

type SearchResult = {
  id: string
  title: string
  updatedAt: string
  snippet: string | null
  matchedIn: "title" | "content"
  noteTags: { tag: { id: string; name: string } }[]
}

// Highlight the query within a string with a <mark> span
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5 font-semibold not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function ResultSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
      <div className="w-9 h-9 bg-muted rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

export function SearchBar() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery] = useDebounce(query, 250)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // ⌘K to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Lock body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    return () => { document.body.style.overflow = "" }
  }, [open])

  // Fetch results
  React.useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery.trim()) {
        setResults([])
        setLoading(false)
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
        console.error("Search fetch error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [debouncedQuery])

  const handleSelect = (noteId: string) => {
    router.push(`/notes/${noteId}`)
    setOpen(false)
    setQuery("")
  }

  const handleClose = () => {
    setOpen(false)
    setQuery("")
  }

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-all group w-full"
      >
        <Search className="w-4 h-4 shrink-0 group-hover:text-foreground transition-colors" />
        <span className="flex-1 text-left truncate">Search notes...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* ── Search Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start sm:items-start justify-center pt-0 sm:pt-[15vh]"
          onClick={handleClose}
        >
          {/* Modal panel — full screen on mobile, floating on desktop */}
          <div
            className="w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-xl bg-card border-0 sm:border shadow-2xl overflow-hidden flex flex-col animate-in fade-in sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Command className="flex flex-col flex-1 overflow-hidden" shouldFilter={false}>

              {/* Input row */}
              <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
                {loading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                ) : (
                  <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <Command.Input
                  ref={inputRef}
                  placeholder="Search by title, content, or tag..."
                  value={query}
                  onValueChange={setQuery}
                  className="flex-1 bg-transparent py-1 outline-none text-foreground placeholder:text-muted-foreground text-base sm:text-sm font-medium"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="sm:hidden p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Results list */}
              <Command.List className="overflow-y-auto flex-1 sm:max-h-[55vh] p-2">

                {/* Loading skeletons */}
                {loading && (
                  <div className="space-y-1">
                    <ResultSkeleton />
                    <ResultSkeleton />
                    <ResultSkeleton />
                  </div>
                )}

                {/* Empty state */}
                {!loading && debouncedQuery && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm text-foreground mb-1">
                      No notes found for &ldquo;{debouncedQuery}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try searching by a different keyword or tag name.
                    </p>
                  </div>
                )}

                {/* Prompt when no query */}
                {!loading && !debouncedQuery && (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-6 text-muted-foreground">
                    <Search className="w-8 h-8 opacity-20 mb-3" />
                    <p className="text-sm">Start typing to search your notes</p>
                    <p className="text-xs mt-1 opacity-60">Searches titles, content, and tags</p>
                  </div>
                )}

                {/* Results */}
                {!loading && results.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                      {results.length} result{results.length !== 1 ? "s" : ""}
                    </p>
                    {results.map((note) => (
                      <Command.Item
                        key={note.id}
                        value={note.id}
                        onSelect={() => handleSelect(note.id)}
                        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/60 aria-selected:bg-muted/60 transition-colors group"
                      >
                        {/* Icon */}
                        <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate leading-snug">
                            <HighlightMatch text={note.title || "Untitled"} query={query} />
                          </p>

                          {/* Content snippet */}
                          {note.snippet && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              <HighlightMatch text={note.snippet} query={query} />
                            </p>
                          )}

                          {/* Tags + time */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {note.noteTags.slice(0, 3).map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm font-medium"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag.name}
                              </span>
                            ))}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 ml-auto">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDistanceToNow(new Date(note.updatedAt))} ago
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </Command.Item>
                    ))}
                  </>
                )}
              </Command.List>

              {/* Footer hint */}
              <div className="hidden sm:flex items-center gap-4 border-t px-4 py-2 shrink-0">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <kbd className="font-mono px-1 border rounded text-[9px]">↑↓</kbd> navigate
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <kbd className="font-mono px-1 border rounded text-[9px]">↵</kbd> open
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <kbd className="font-mono px-1 border rounded text-[9px]">Esc</kbd> close
                </span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
