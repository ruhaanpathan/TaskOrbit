import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function NoteEditorLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-10 w-2/3 md:w-1/2" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="border rounded-xl shadow-sm flex-1 min-h-[500px] w-full" />
      </div>

      <div className="w-full lg:w-[280px] flex flex-col gap-6 shrink-0 pt-2 lg:pt-14">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5 mb-4" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
