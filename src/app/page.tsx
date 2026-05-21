import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-gradient-to-b from-background to-muted/50 text-center">
      <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          TaskOrbit <span className="text-primary">AI Notes</span>
        </h1>
        <p className="text-xl text-muted-foreground md:text-2xl leading-relaxed">
          Your collaborative, AI-powered workspace. Capture your thoughts, organize with tags, and let AI generate summaries and action items.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all">
              Get Started
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 rounded-full">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
