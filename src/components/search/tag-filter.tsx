"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface TagFilterProps {
  availableTags: string[]
}

export function TagFilter({ availableTags }: TagFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTagsParam = searchParams.get("tags")
  
  const currentTags = currentTagsParam ? currentTagsParam.split(",").filter(Boolean) : []

  const toggleTag = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    let newTags = [...currentTags]
    if (tag === "ALL") {
      newTags = []
    } else {
      if (newTags.includes(tag)) {
        newTags = newTags.filter(t => t !== tag)
      } else {
        newTags.push(tag)
      }
    }

    if (newTags.length > 0) {
      params.set("tags", newTags.join(","))
    } else {
      params.delete("tags")
    }

    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Badge 
        variant={currentTags.length === 0 ? "default" : "secondary"}
        className="cursor-pointer hover:bg-primary/80 transition-colors px-3 py-1"
        onClick={() => toggleTag("ALL")}
      >
        All Notes
      </Badge>
      
      {availableTags.map(tag => {
        const isSelected = currentTags.includes(tag)
        return (
          <Badge
            key={tag}
            variant={isSelected ? "default" : "secondary"}
            className="cursor-pointer hover:bg-primary/80 transition-colors px-3 py-1"
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </Badge>
        )
      })}
    </div>
  )
}
