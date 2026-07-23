import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <div className="w-full space-y-6">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <Skeleton className="h-[450px] w-full rounded-lg" />
      </div>
    </div>
  )
}
