import * as React from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { MusicPanel, type Playlist } from "@/components/MusicPanel"
import { Confetti } from "@/components/quest/Confetti"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/ui/empty-state"
import { MonsterArt } from "@/components/ui/monster-art"
import { Select } from "@/components/ui/select"
import {
  clock,
  isRunning,
  loadBlitz,
  saveBlitz,
  secondsLeft,
  subscribeBlitz,
  type BlitzSession,
} from "@/lib/blitz-session"

import type { PageProps, Quest } from "@/types/inertia"

const DESCRIPTION = "A short, timed burst of chores you choose: pick 5 to 20 minutes, tick the chores you fancy, and tidy with some music."

export default function Blitz() {
  const { props } = usePage<
    PageProps<{
      minutes: number
      options: number[]
      choices: Quest[]
      suggested: number[]
      treat: string | null
      playlists: Playlist[]
      bonus: { min: number; xp: number; coins: number }
    }>
  >()
  const { options, choices, suggested, treat, playlists, bonus } = props

  // The sprint lives in this browser so it survives leaving the page.
  const [session, setSession] = React.useState<BlitzSession | null>(null)
  const [ready, setReady] = React.useState(false)
  const [, tick] = React.useState(0)
  const [picked, setPicked] = React.useState<number[]>([])
  const [room, setRoom] = React.useState("all")
  const minutes = session?.minutes ?? props.minutes

  React.useEffect(() => {
    const sync = () => setSession(loadBlitz())
    sync()
    setReady(true)
    return subscribeBlitz(sync)
  }, [])

  // Re-suggest when the length changes, until the player has started.
  React.useEffect(() => {
    if (!session) setPicked(suggested)
  }, [suggested])

  React.useEffect(() => {
    if (!session || !isRunning(session)) return
    const id = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [session])

  const byId = React.useMemo(() => new Map(choices.map((c) => [c.id, c])), [choices])
  const rooms = Array.from(new Set(choices.map((c) => c.room_label?.replace(/ \d+$/, "") ?? "Anywhere"))).sort()
  const roomOf = (c: Quest) => c.room_label?.replace(/ \d+$/, "") ?? "Anywhere"
  const visibleChoices = choices.filter((c) => room === "all" || roomOf(c) === room)

  const chosenMinutes = picked.reduce((sum, id) => sum + (byId.get(id)?.duration_minutes ?? 0), 0)
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const start = () => {
    const ms = minutes * 60_000
    saveBlitz({ minutes, picked: picked.filter((id) => byId.has(id)), endsAt: Date.now() + ms, remainingMs: ms, cleared: 0, finished: false, startedAt: Date.now() })
  }

  const left = session ? secondsLeft(session) : minutes * 60
  const running = !!session && isRunning(session)
  const timeUp = !!session && !session.finished && left === 0

  const finish = React.useCallback(
    (s: BlitzSession) => {
      saveBlitz({ ...s, endsAt: null, remainingMs: secondsLeft(s) * 1000, finished: true })
      if (s.cleared >= bonus.min) router.post("/blitz/finish", { minutes: s.minutes, started_at: s.startedAt }, { preserveScroll: true })
    },
    [bonus.min],
  )

  // Time ran out while you were here or away: close the sprint (and claim any bonus) once.
  React.useEffect(() => {
    if (session && timeUp) finish(session)
  }, [timeUp])

  const pauseOrResume = () => {
    if (!session) return
    if (running) saveBlitz({ ...session, endsAt: null, remainingMs: secondsLeft(session) * 1000 })
    else saveBlitz({ ...session, endsAt: Date.now() + session.remainingMs })
  }

  const done = (q: Quest) => {
    if (!session) return
    saveBlitz({ ...session, cleared: session.cleared + 1, picked: session.picked.filter((id) => id !== q.id) })
    router.post(`/blitz/${q.id}/complete`, { minutes: session.minutes }, { preserveScroll: true })
  }

  const add = (id: number) => session && saveBlitz({ ...session, picked: [...session.picked, id] })
  const drop = (id: number) => session && saveBlitz({ ...session, picked: session.picked.filter((x) => x !== id) })
  const reset = () => saveBlitz(null)

  const lineUp = (session?.picked ?? []).map((id) => byId.get(id)).filter((c): c is Quest => !!c)
  const more = choices.filter((c) => !(session?.picked ?? []).includes(c.id))
  const over = chosenMinutes > minutes

  return (
    <>
      <Head title="Tidy blitz">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Tidy blitz" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader title="Tidy blitz" description="Beat the clock with chores you choose. Leave and come back any time: your blitz keeps going." />

        {!ready ? null : !session ? (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Length">
              {options.map((m) => (
                <Link key={m} href={`/blitz?minutes=${m}`} className="toggle-button" aria-current={m === minutes ? "true" : undefined}>
                  {m} minutes
                </Link>
              ))}
            </div>

            <section className="mt-6" aria-label="Choose your chores">
              <h2>Choose your chores</h2>
              <p className="mt-1 caption">
                Tick what you fancy, or let us suggest a few that fit {minutes} minutes. Quickest first.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <Button size="sm" variant="secondary" onClick={() => setPicked(suggested)}>Pick for me</Button>
                <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
                {rooms.length > 1 && (
                  <div className="space-y-1">
                    <label htmlFor="blitz-room">Room</label>
                    <Select id="blitz-room" value={room} onChange={(e) => setRoom(e.target.value)}>
                      <option value="all">All rooms</option>
                      {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </div>
                )}
              </div>

              {choices.length === 0 ? (
                <EmptyState className="mt-4" monster="dust_bunny_horde" title="Nothing waiting" action={<Button asChild><Link href="/quests">Open the Quest Board</Link></Button>}>
                  Everything is done for now. Enjoy it!
                </EmptyState>
              ) : (
                <ul className="mt-4 list-none divide-y divide-hairline p-0">
                  {visibleChoices.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-start gap-3 py-3 font-normal text-ink-body">
                        <Checkbox className="mt-1" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                        <span className="flex-1">
                          {c.title}
                          <span className="block caption">{roomOf(c)} · about {c.duration_minutes} min</span>
                        </span>
                        <Badge tone="signal">+{c.xp} XP</Badge>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="sticky bottom-20 mt-4 rounded-2xl border border-hairline bg-surface p-4 lg:bottom-4" aria-label="Start">
              <p aria-live="polite">
                <strong>{picked.length} {picked.length === 1 ? "chore" : "chores"}</strong> · about {chosenMinutes} min
                {over ? ` (a bit over ${minutes}, and that's fine)` : ""}
              </p>
              <p className="caption">Clear {bonus.min} or more for a bonus: +{bonus.xp} XP and +{bonus.coins} coins for every chore.</p>
              <Button className="mt-3" disabled={picked.length === 0} onClick={start}>Start the blitz</Button>
            </section>
          </>
        ) : (
          <>
            <section className="relative mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-hairline bg-surface p-5" aria-label="Timer">
              {session.finished && session.cleared > 0 && <Confetti />}
              <p role="timer" aria-label="Time left" className="timer-readout"><strong>{clock(left)}</strong></p>
              {!session.finished && !timeUp && (
                <Button onClick={pauseOrResume}>{running ? "Pause" : "Resume"}</Button>
              )}
              {!session.finished && !timeUp && session.cleared > 0 && (
                <Button variant="secondary" onClick={() => finish(session)}>Finish now</Button>
              )}
              <p aria-live="polite">
                {session.finished
                  ? <>
                      <strong>{left === 0 ? "Time!" : `Finished with ${clock(left)} to spare!`}</strong>{" "}
                      {session.cleared > 0 ? `You cleared ${session.cleared} ${session.cleared === 1 ? "chore" : "chores"}.` : "Nothing cleared, and that's fine."}
                      {treat ? ` Time for your treat: ${treat}.` : ""}
                    </>
                  : session.cleared > 0
                    ? `${session.cleared} ${session.cleared === 1 ? "chore" : "chores"} cleared${session.cleared >= bonus.min ? ". Bonus unlocked!" : `. ${bonus.min - session.cleared} more for a bonus.`}`
                    : `Clear ${bonus.min} or more for a bonus: +${bonus.xp} XP and +${bonus.coins} coins for every chore.`}
              </p>
              {session.finished && <Button variant="secondary" onClick={reset}>Start another blitz</Button>}
            </section>

            {!session.finished && (
              <>
                <section className="mt-8" aria-label="Line-up">
                  <h2>Your line-up</h2>
                  {lineUp.length === 0 ? (
                    <p className="mt-2">All ticked off! Add another chore below, or finish up.</p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {lineUp.map((q) => (
                        <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
                          <MonsterArt monster={q.monster.key} className="h-12 w-12" />
                          <div className="flex-1">
                            <h3>{q.title}</h3>
                            <p className="caption">{roomOf(q)} · about {q.duration_minutes} min</p>
                          </div>
                          <Badge tone="signal">+{q.xp} XP</Badge>
                          <Button size="sm" onClick={() => done(q)}>Done</Button>
                          <Button size="sm" variant="ghost" aria-label={`Take out of the blitz: ${q.title}`} onClick={() => drop(q.id)}>Not this one</Button>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                {more.length > 0 && (
                  <details className="mt-6">
                    <summary className="cursor-pointer">Add more chores ({more.length} ready)</summary>
                    <ul className="mt-3 list-none divide-y divide-hairline p-0">
                      {more.map((c) => (
                        <li key={c.id} className="flex items-center gap-3 py-2">
                          <span className="flex-1">
                            {c.title}
                            <span className="block caption">{roomOf(c)} · about {c.duration_minutes} min</span>
                          </span>
                          <Button size="sm" variant="secondary" aria-label={`Add to the blitz: ${c.title}`} onClick={() => add(c.id)}>Add</Button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </>
        )}

        <div className="mt-8 max-w-xl">
          <MusicPanel playlists={playlists} />
        </div>
      </AppShell>
    </>
  )
}
