import { useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { FocusMode } from "@/components/quest/FocusMode"
import { OneThingCard } from "@/components/quest/OneThingCard"
import { LogoMark } from "@/components/Logo"
import { Cottage } from "@/components/sanctuary/Cottage"
import { Badge } from "@/components/ui/badge"
import { BirdSays } from "@/components/ui/bird-says"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { MonsterArt } from "@/components/ui/monster-art"
import { ProgressRing } from "@/components/ui/progress-ring"

import type { Badge as BadgeType, Challenge, FocusTarget, PageProps, Quest, SanctuaryData } from "@/types/inertia"

const DESCRIPTION =
  "Your Nest Quest day: one clear thing to do, your progress this week, and your cottage. Small steps, no pressure."

type TodayProps = {
  greeting: string
  prompt: { kind: string; message: string; link?: { href: string; label: string } } | null
  available_count: number
  one_thing: { quest: Quest | null; energy: string; intention: { anchor: string | null } | null }
  week: { days: { label: string; date: string; active: boolean; today: boolean }[]; active_days: number; target: number; met: boolean }
  today: { wins: number; goal: number }
  identity: string
  anchors: string[]
  default_anchor: string | null
  treat: string | null
  challenges: Challenge[]
  boss: { id: number; title: string; monster_key: string; health_remaining: number; health_total: number } | null
  todos: { id: number; title: string; remind_text: string | null }[]
  todo_open_count: number
  achievements: BadgeType[]
  sanctuary: SanctuaryData
  lucky: { opened: boolean; coins: number | null; xp: number | null }
  combo: { title: string; monster_key: string; task_ids: number[]; chores: string[]; minutes: number; bonus_xp: number; bonus_coins: number } | null
  done_today: { count: number; minutes: number; items: string[] }
}

export default function Today() {
  const { props } = usePage<PageProps<TodayProps>>()
  const { greeting, prompt, one_thing, week, today, identity, anchors, default_anchor, treat, achievements, sanctuary, todos, todo_open_count, boss, challenges, lucky, combo, done_today } = props
  const [newTodo, setNewTodo] = useState("")
  const [excluded, setExcluded] = useState<number[]>([])
  const [focus, setFocus] = useState<FocusTarget | null>(null)
  const quest = one_thing.quest

  const go = (data: Record<string, string | number | number[]>) =>
    router.get("/", data, { preserveScroll: true, preserveState: true })

  const startFocus = (q: Quest) =>
    setFocus({ task_id: q.id, monster_key: q.monster.key, title: q.title, quest_title: q.fantasy_title, minutes: q.duration_minutes, steps: [], splittable: q.recurrence_kind === "none" })

  return (
    <>
      <Head title="Today">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Today" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <h1>{greeting}</h1>

        {prompt && (
          <BirdSays className="mt-4">
            <p>
              {prompt.message}
              {prompt.link && <> <Link href={prompt.link.href}>{prompt.link.label}</Link></>}
            </p>
          </BirdSays>
        )}

        <section className="mt-8" aria-label="Your one thing today">
          <h2>Your one thing today</h2>
          <div className="mt-4">
            {quest ? (
              <OneThingCard
                quest={quest}
                intentionAnchor={one_thing.intention ? one_thing.intention.anchor ?? "" : null}
                anchors={anchors}
                defaultAnchor={default_anchor}
                onStart={startFocus}
                onSwap={() => {
                  const next = [...excluded, quest.id]
                  setExcluded(next)
                  go({ exclude: next })
                }}
                onEasier={() => go({ easier: 1, exclude: excluded })}
              />
            ) : (
              <div className="rounded-2xl border border-hairline bg-surface p-5">
                <p>
                  Nothing is ready right now, and that's fine; rest counts too. You can{" "}
                  <Link href="/add-chores/rooms">add suggested chores</Link> or see the <Link href="/quests">Quest Board</Link>.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/blitz">Tidy blitz</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/plan">Plan my day</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/quests">Today's list</Link>
            </Button>
          </div>
        </section>

        <section className="mt-6 flex max-w-xl items-center gap-4 rounded-2xl border border-hairline bg-surface p-4" aria-label="Lucky button">
          <LogoMark className="h-14 w-14 shrink-0" />
          <div className="flex-1">
            <h2 className="heading-sm">Today's lucky button</h2>
            {lucky.opened ? (
              <p className="caption">
                The bird found {[lucky.coins ? `${lucky.coins} coins` : null, lucky.xp ? `${lucky.xp} XP` : null].filter(Boolean).join(" and ")} today. Come back tomorrow!
              </p>
            ) : (
              <p className="caption">The bird found something shiny. Tap to see what!</p>
            )}
          </div>
          {!lucky.opened && (
            <Button size="sm" onClick={() => router.post("/lucky_button", {}, { preserveScroll: true })}>Open it</Button>
          )}
        </section>

        {sanctuary.teaser && (
          <p className="mt-4 max-w-xl">
            🏡 Next cottage treat: <strong>{sanctuary.teaser.name}</strong>
            {sanctuary.teaser.coins_needed > 0 ? ` (${sanctuary.teaser.coins_needed} coins to go). ` : ". You can buy it now! "}
            <Link href="/sanctuary">Visit the cottage</Link>
          </p>
        )}

        {combo && (
          <section className="mt-6 max-w-xl rounded-2xl border border-hairline bg-accent-faded p-4" aria-label="Stack it">
            <h2 className="heading-sm">Stack it: {combo.title}</h2>
            <p className="caption mt-1">
              {combo.chores.length} quick chores, about {combo.minutes} minutes. Finish them all for up to +{combo.bonus_xp} XP and +{combo.bonus_coins} coins.
            </p>
            <ul className="mt-2 list-none p-0">
              {combo.chores.map((c) => <li key={c} className="py-0.5">• {c}</li>)}
            </ul>
            <Button
              className="mt-3"
              size="sm"
              onClick={() => router.post("/battles", { title: combo.title, monster_key: combo.monster_key, task_ids: combo.task_ids })}
            >
              Fight them as a boss battle
            </Button>
          </section>
        )}

        <section className="mt-8" aria-label="Your progress">
          <h2 className="sr-only">Your progress</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-3">
              <ProgressRing
                size={64}
                value={today.wins}
                max={today.goal}
                center={<>{Math.min(today.wins, today.goal)}/{today.goal}</>}
                label="Today's wins"
              />
              <p>
                <strong>Today's wins</strong>
                <span className="block caption">
                  {today.wins >= today.goal ? "Goal reached. Anything more is a bonus." : `${today.goal - today.wins} more for a great day.`}
                </span>
              </p>
            </div>
            <div className="flex-1">
              <ul className="flex list-none gap-1 p-0" aria-label="Days this week">
                {week.days.map((d) => (
                  <li
                    key={d.date}
                    title={d.label}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                      d.active ? "border border-accent-strong bg-accent text-on-accent" : d.today ? "border border-accent-strong text-ink-body" : "border border-hairline text-ink-muted"
                    }`}
                  >
                    <span aria-hidden="true">{d.label[0]}</span>
                    <span className="sr-only">{d.label}: {d.active ? "active" : d.today ? "today" : "quiet"}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 caption">{week.met ? "Weekly goal met!" : `${week.active_days} of ${week.target} days this week. Any pace counts.`}</p>
            </div>
          </div>
          <p className="mt-3 italic">{identity}</p>
        </section>

        {done_today.count > 0 && (
          <section className="mt-8" aria-label="Done today">
            <h2>Done today</h2>
            <p className="mt-1 caption">
              {done_today.count} {done_today.count === 1 ? "thing" : "things"} · about {done_today.minutes} minutes. Look at that!
            </p>
            <ul className="mt-2 list-none p-0">
              {done_today.items.map((title, i) => (
                <li key={`${title}-${i}`} className="py-1">✓ {title}</li>
              ))}
            </ul>
          </section>
        )}


        <section className="mt-10" aria-label="Challenges">
          <h2>Challenges</h2>
          <p className="mt-1 caption">Optional extras. No timers, and nothing is lost if you skip one.</p>
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
            {challenges.map((c) => (
              <li key={c.key} className="rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="heading-sm">{c.name}</h3>
                  <Badge tone="muted">{c.period === "daily" ? "Today" : "This week"}</Badge>
                </div>
                <p className="mt-1">{c.description}</p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-hairline"
                  role="progressbar"
                  aria-label={`${c.name} progress`}
                  aria-valuemin={0}
                  aria-valuemax={c.target}
                  aria-valuenow={c.current}
                >
                  <div className="h-full rounded-full bg-accent-strong transition-all" style={{ width: `${Math.round((c.current / c.target) * 100)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="caption">{c.current} of {c.target} · +{c.xp} XP, +{c.coins} coins</p>
                  {c.claimed ? (
                    <Badge tone="accent">Claimed</Badge>
                  ) : (
                    c.complete ? (
                      <Button
                        size="sm"
                        aria-label={`Claim reward: ${c.name}`}
                        onClick={() => router.post(`/challenges/${c.period}/claim`, {}, { preserveScroll: true })}
                      >
                        Claim reward
                      </Button>
                    ) : (
                      <p className="caption">{c.target - c.current} to go</p>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {boss && (
          <section className="mt-10" aria-label="Boss battle in progress">
            <h2>Boss battle in progress</h2>
            <div className="mt-3 flex max-w-xl items-center gap-4 rounded-2xl border border-hairline bg-surface p-4">
              <MonsterArt monster={boss.monster_key} className="h-16 w-16" />
              <div className="flex-1">
                <p><strong>{boss.title}</strong></p>
                <p className="caption">{boss.health_remaining} / {boss.health_total} HP left</p>
              </div>
              <Button asChild size="sm"><Link href={`/battles/${boss.id}`}>Continue</Link></Button>
            </div>
          </section>
        )}

        <section className="mt-10" aria-label="Quick to-dos">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2>Quick to-dos</h2>
            <Link href="/todos">All to-dos{todo_open_count > 0 ? ` (${todo_open_count})` : ""}</Link>
          </div>
          {todos.length > 0 && (
            <ul className="mt-3 max-w-xl list-none divide-y divide-hairline p-0">
              {todos.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <Checkbox
                    id={`today-todo-${t.id}`}
                    checked={false}
                    onChange={() => router.post(`/todos/${t.id}/complete`, {}, { preserveScroll: true })}
                    aria-label={`Mark done: ${t.title}`}
                  />
                  <label htmlFor={`today-todo-${t.id}`} className="flex-1 font-normal text-ink-body">{t.title}</label>
                  {t.remind_text && <Badge tone="accent">{t.remind_text}</Badge>}
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-3 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              router.post("/todos", { title: newTodo }, { preserveScroll: true, onSuccess: () => setNewTodo("") })
            }}
          >
            <Input aria-label="Add a quick to-do" placeholder="Add a quick to-do" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={newTodo.trim() === ""}>Add</Button>
          </form>
        </section>

        {achievements.length > 0 && (
          <section className="mt-10" aria-label="Your badges">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2>Your badges</h2>
              <Link href="/achievements">See all badges</Link>
            </div>
            <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
              {achievements.map((b) => (
                <li key={b.key}>
                  <Badge tone="accent" title={b.description}>{b.name}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12" aria-label="Your cottage">
          <h2>Your cottage</h2>
          <div className="mt-4 grid items-center gap-6 sm:grid-cols-2">
            <Cottage
              placements={sanctuary.placements.living_room ?? {}}
              names={Object.fromEntries(sanctuary.items.map((i) => [i.key, i.name]))}
            />
            <div className="space-y-3">
              {sanctuary.teaser && (
                <p>
                  Next up: <strong>{sanctuary.teaser.name}</strong> for {sanctuary.teaser.price} coins
                  {sanctuary.teaser.coins_needed > 0
                    ? ` (${sanctuary.teaser.coins_needed} to go).`
                    : ". You can buy it now!"}
                </p>
              )}
              <Button asChild variant="secondary">
                <Link href="/sanctuary">Visit the sanctuary</Link>
              </Button>
            </div>
          </div>
        </section>

        {focus && <FocusMode target={focus} treat={treat} onClose={() => setFocus(null)} />}
      </AppShell>
    </>
  )
}
