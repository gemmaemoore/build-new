import * as React from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Confetti } from "@/components/quest/Confetti"
import { MusicPanel, type Playlist } from "@/components/MusicPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { MonsterArt } from "@/components/ui/monster-art"

import type { PageProps, Quest } from "@/types/inertia"

const DESCRIPTION = "A short, timed burst of small chores: pick 5 to 20 minutes, get a line-up that fits, and tidy with some music."

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

export default function Blitz() {
  const { props } = usePage<PageProps<{ minutes: number; options: number[]; queue: Quest[]; treat: string | null; playlists: Playlist[]; bonus: { min: number; xp: number; coins: number } }>>()
  const { minutes, options, queue, treat, playlists, bonus } = props
  const total = minutes * 60
  const [left, setLeft] = React.useState(total)
  const [running, setRunning] = React.useState(false)
  const [cleared, setCleared] = React.useState(0)
  const [ended, setEnded] = React.useState(false)

  React.useEffect(() => {
    setLeft(total)
    setRunning(false)
    setCleared(0)
    setEnded(false)
  }, [total])

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const finished = left === 0 || ended

  // Time up (or finishing early): claim the sprint bonus once.
  React.useEffect(() => {
    if (!finished || cleared < bonus.min) return
    router.post("/blitz/finish", { minutes }, { preserveScroll: true })
  }, [finished])
  const started = running || left < total
  const done = (q: Quest) => {
    setCleared((n) => n + 1)
    router.post(`/blitz/${q.id}/complete`, { minutes }, { preserveScroll: true })
  }

  return (
    <>
      <Head title="Tidy blitz">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Tidy blitz" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader title="Tidy blitz" description="Beat the clock with a handful of small chores. Stop any time: every chore you finish counts." />

        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Length">
          {options.map((m) => (
            <Link key={m} href={`/blitz?minutes=${m}`} className="toggle-button" aria-current={m === minutes ? "true" : undefined}>
              {m} minutes
            </Link>
          ))}
        </div>

        <section className="relative mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-hairline bg-surface p-5" aria-label="Timer">
          {finished && cleared > 0 && <Confetti />}
          <p role="timer" aria-label="Time left" className="timer-readout"><strong>{clock(left)}</strong></p>
          {!finished && (
            <Button onClick={() => setRunning((r) => !r)}>{running ? "Pause" : started ? "Resume" : "Start the blitz"}</Button>
          )}
          {!finished && cleared > 0 && (
            <Button variant="secondary" onClick={() => { setRunning(false); setEnded(true) }}>Finish now</Button>
          )}
          <p aria-live="polite">
            {cleared > 0
              ? `${cleared} ${cleared === 1 ? "chore" : "chores"} cleared${cleared >= bonus.min ? ". Bonus unlocked!" : `. ${bonus.min - cleared} more for a bonus.`}`
              : `Clear ${bonus.min} or more for a bonus: +${bonus.xp} XP and +${bonus.coins} coins for every chore.`}
          </p>
          {finished && (
            <p role="status">
              <strong>{left === 0 ? "Time!" : "Nicely done!"}</strong> {cleared > 0 ? `You cleared ${cleared} ${cleared === 1 ? "chore" : "chores"}.` : "Nothing cleared, and that's fine."}
              {treat ? ` Time for your treat: ${treat}.` : ""}
            </p>
          )}
        </section>

        <section className="mt-8" aria-label="Line-up">
          <h2>Your line-up</h2>
          {queue.length === 0 ? (
            <EmptyState className="mt-3" monster="dust_bunny_horde" title="Nothing waiting" action={<Button asChild><Link href="/quests">Open the Quest Board</Link></Button>}>
              Everything small is done for now. Enjoy it!
            </EmptyState>
          ) : (
            <ol className="mt-3 space-y-3">
              {queue.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
                  <MonsterArt monster={q.monster.key} className="h-12 w-12" />
                  <div className="flex-1">
                    <h3>{q.title}</h3>
                    <p className="caption">{q.room_label ?? "Anywhere"} · about {q.duration_minutes} min</p>
                  </div>
                  <Badge tone="signal">+{q.xp} XP</Badge>
                  <Button size="sm" onClick={() => done(q)}>Done</Button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="mt-8 max-w-xl">
          <MusicPanel playlists={playlists} />
        </div>
      </AppShell>
    </>
  )
}
