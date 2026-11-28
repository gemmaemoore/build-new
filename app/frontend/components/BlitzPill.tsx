import * as React from "react"
import { Link, usePage } from "@inertiajs/react"
import { Zap } from "lucide-react"
import { clock, isRunning, loadBlitz, secondsLeft, subscribeBlitz, type BlitzSession } from "@/lib/blitz-session"

// "Your tidy blitz is still going": a small pill on every screen but the blitz
// itself, so a sprint is never lost by wandering off.
export function BlitzPill() {
  const { url } = usePage()
  const [session, setSession] = React.useState<BlitzSession | null>(null)
  const [, tick] = React.useState(0)

  React.useEffect(() => {
    const sync = () => setSession(loadBlitz())
    sync()
    return subscribeBlitz(sync)
  }, [])

  React.useEffect(() => {
    if (!session || !isRunning(session)) return
    const id = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [session])

  if (!session || session.finished || url.startsWith("/blitz")) return null
  const left = secondsLeft(session)
  const label = left === 0 ? "Time's up" : isRunning(session) ? `${clock(left)} left` : "Paused"

  return (
    <Link
      href={`/blitz?minutes=${session.minutes}`}
      className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-accent-strong bg-accent px-4 py-2 text-sm font-medium text-on-accent no-underline shadow-md lg:bottom-6"
    >
      <Zap className="h-4 w-4" aria-hidden="true" />
      <span>Blitz: {label}. Back to it</span>
    </Link>
  )
}
