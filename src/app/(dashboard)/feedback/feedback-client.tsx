"use client"

import { useState } from "react"
import { 
  MessageSquareHeart, 
  Send, 
  CheckCircle2, 
  Lightbulb, 
  Bug, 
  Layout, 
  MessageSquare, 
  Mail, 
  Sparkles,
  Loader2,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { submitFeedbackAction } from "@/actions/feedback"
import { toast } from "sonner"

const CATEGORIES = [
  { id: "Feature Request", title: "Feature Request", icon: Lightbulb, desc: "Suggest a new idea or enhancement for TaskOrbit" },
  { id: "Bug Report", title: "Bug Report", icon: Bug, desc: "Report an issue, crash, or unexpected behavior" },
  { id: "UI / UX Suggestion", title: "UI / UX Suggestion", icon: Layout, desc: "Feedback on styling, colors, layout or alignment" },
  { id: "General Feedback", title: "General Feedback", icon: MessageSquare, desc: "Any thoughts, praise, or general suggestions" },
]

export function FeedbackPageClient({ userEmail }: { userEmail: string }) {
  const [category, setCategory] = useState("Feature Request")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and feedback message")
      return
    }

    setSubmitting(true)
    try {
      const res = await submitFeedbackAction({
        category,
        subject,
        message,
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Feedback sent directly to rkp2905t@gmail.com!")
        setSubmitted(true)
      }
    } catch (err) {
      toast.error("Something went wrong while sending feedback")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full py-16 text-center animate-in fade-in zoom-in-95 duration-500 space-y-6">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20 shadow-lg">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight">Thank You for Your Feedback!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your message has been delivered directly to <strong className="text-foreground">rkp2905t@gmail.com</strong>. We review every submission to make TaskOrbit better for everyone.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => {
              setSubmitted(false)
              setSubject("")
              setMessage("")
            }}
            variant="outline"
            className="font-bold gap-2"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Send Another Feedback
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Page Header (Full Width) */}
      <div>
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
          <MessageSquareHeart className="w-4 h-4" /> Feedback & Suggestions
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Send Feedback
        </h1>
        <p className="text-muted-foreground mt-1 font-medium text-sm">
          Have an idea, bug report, or design suggestion? Send a direct message to <strong className="text-foreground">rkp2905t@gmail.com</strong>.
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Category Selection & Email Destination Badge (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              1. Select Feedback Category
            </label>

            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isSelected = category === cat.id
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3.5 ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border/80 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {cat.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                          {cat.desc}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Feedback Details Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="shadow-sm border-border/80 bg-card">
            <form onSubmit={handleSubmit}>
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <span>2. Feedback Message</span>
                  <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                    {category}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Submitting as <strong className="text-foreground">{userEmail}</strong>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                
                {/* Subject / Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Subject / Summary <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Add dark mode preference persistence or Fix checkbox alignment"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="text-sm h-10"
                  />
                </div>

                {/* Detailed Message */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1">
                    Detailed Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Write your feedback, feature request, or report here in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    required
                    className="text-sm leading-relaxed"
                  />
                </div>

              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-border/40 bg-muted/10">
                <span className="text-xs text-muted-foreground font-medium">
                  We value your input to make TaskOrbit better.
                </span>

                <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto gap-2 font-bold px-8">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

      </div>

      {/* Footer (Feedback Page Only) */}
      <footer className="w-full border-t border-border/40 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5">
          <span>Designed & Built by</span>
          <a 
            href="https://www.linkedin.com/in/ruhaan-pathan-ab7bb0328/" 
            target="_blank" 
            rel="noreferrer" 
            className="font-bold text-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            Ruhaan Pathan
          </a>
        </div>

        <div className="flex items-center gap-4">
          <span>TaskOrbit AI Workspace</span>
          <span>•</span>
          <a 
            href="https://github.com/ruhaanpathan" 
            target="_blank" 
            rel="noreferrer" 
            className="hover:text-foreground transition-colors"
          >
            GitHub @ruhaanpathan
          </a>
        </div>
      </footer>

    </div>
  )
}
