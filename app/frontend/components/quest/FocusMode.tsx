import * as React from "react"
import { router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MonsterArt } from "@/components/ui/monster-art"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { FocusTarget } from "@/types/inertia"

const TWO_MINUTES = 120

const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

type Mode = "idle" | "two" | "free"

// One task, one clear action. "Just 2 minutes" lowers the barrier to starting:
// beginning counts (a small XP award, once), and stopping after two minutes is
// fine. The timers are optional and client-only.
export function FocusMode({
  target,
  treat,
  onClose,
}: {
  target: FocusTarget
  treat?: string | null
  onClose: () => void
}) {
  const [mode, setMode] = React.useState<Mode>("idle")
  const [seconds, setSeconds] = React.useState(0)
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const post = (path: string, onSuccess?: () => void) =>
    router.post(path, {}, { preserveScroll: true, onSuccess })

  const [started, setStarted] = React.useState<number | null>(null)
  const [steps, setSteps] = React.useState<string[]>(target.steps)
  const [ticked, setTicked] = React.useState<number[]>([])
  const [loadingSteps, setLoadingSteps] = React.useState(false)

  // "Break it into tiny steps": a short checklist for a stuck task.
  const loadSteps = () => {
    setLoadingSteps(true)
    fetch(`/tasks/${target.task_id}/tiny_steps`, { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.steps && setSteps(data.steps))
      .catch(() => undefined)
      .finally(() => setLoadingSteps(false))
  }
  const toggleStep = (i: number) => setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]))

  const begin = (next: Mode) => {
    setMode(next)
    setSeconds(0)
    setRunning(true)
    // Beginning earns a small one-off XP. A plain fetch (not an Inertia visit)
    // so nothing else is navigated or refreshed under the player.
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""
    fetch(`/tasks/${target.task_id}/start`, {
      method: "POST",
      headers: { "X-CSRF-Token": token, Accept: "application/json" },
      credentials: "same-origin",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.awarded && setStarted(data.xp))
      .catch(() => undefined)
  }

  const twoDone = mode === "two" && seconds >= TWO_MINUTES
  const remaining = Math.max(0, TWO_MINUTES - seconds)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {target.monster_key && <MonsterArt monster={target.monster_key} className="h-16 w-16" />}
            <div>
              <DialogTitle>{target.title}</DialogTitle>
              <DialogDescription>
                {target.quest_title} · about {target.minutes} min
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {steps.length > 0 ? (
          <div>
            <ul className="list-none space-y-2 p-0" aria-label="Tiny steps">
              {steps.map((step, i) => (
                <li key={step}>
                  <label className="flex items-start gap-3 font-normal text-ink-body">
                    <Checkbox className="mt-1" checked={ticked.includes(i)} onChange={() => toggleStep(i)} />
                    <span className={ticked.includes(i) ? "line-through text-ink-muted" : ""}>{step}</span>
                  </label>
                </li>
              ))}
            </ul>
            {target.splittable && (
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onClick={() => router.post(`/tasks/${target.task_id}/split`)}
              >
                Turn these into tiny quests
              </Button>
            )}
            <p className="mt-2 caption" aria-live="polite">
              {ticked.length === steps.length ? "Every step done! Press Done! when you're ready." : `${ticked.length} of ${steps.length} steps. Tiny steps count.`}
            </p>
          </div>
        ) : (
          <Button size="sm" variant="ghost" disabled={loadingSteps} onClick={loadSteps}>
            Stuck? Break it into tiny steps
          </Button>
        )}

        {treat && <p className="mt-3 caption">Pair it with a treat: {treat}.</p>}

        <div className="mt-4 space-y-3">
          {mode === "idle" && (
            <>
              <p>Not feeling it? Just start. Two minutes is enough, and starting counts.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => begin("two")}>Just 2 minutes</Button>
                <Button variant="secondary" onClick={() => begin("free")}>Start timer</Button>
              </div>
            </>
          )}

          {mode !== "idle" && (
            <div className="flex flex-wrap items-center gap-3">
              <p role="timer" aria-label={mode === "two" ? "Time left in your two minutes" : "Elapsed time"}>
                <strong>{clock(mode === "two" ? remaining : seconds)}</strong>
              </p>
              {!twoDone && (
                <Button size="sm" variant="secondary" onClick={() => setRunning((r) => !r)}>
                  {running ? "Pause" : "Resume"}
                </Button>
              )}
            </div>
          )}

          {started !== null && (
            <p role="status">Started! +{started} XP. Starting counts, even if you stop early.</p>
          )}

          {twoDone && (
            <p role="status">
              <strong>Two minutes done!</strong> Keep going, or stop here. Either way it counts.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {twoDone || (mode !== "idle") ? "That's enough for now" : "Back"}
          </Button>
          <Button variant="secondary" onClick={() => post(`/tasks/${target.task_id}/skip`, onClose)}>Skip</Button>
          <Button onClick={() => post(`/tasks/${target.task_id}/complete`, onClose)}>Done!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
