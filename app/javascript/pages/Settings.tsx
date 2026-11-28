import { FormEvent, useEffect, useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { currentSubscription, disablePush, enablePush, pushSupported } from "@/lib/push"

import type { PageProps } from "@/types/inertia"

const hourLabel = (h: number) => (h === 12 ? "12 noon" : h > 12 ? `${h - 12}pm` : `${h}am`)

const DESCRIPTION = "Choose your display name, reduce motion, or reset your Nest Quest game data."

export default function Settings() {
  const { props } = usePage<
    PageProps<{
      settings: {
        display_name: string | null
        reduced_motion: boolean
        anchor: string | null
        treat: string | null
        reminder_enabled: boolean
        reminder_hour: number
        reminder_email: boolean
      }
      anchors: string[]
      reminder_hours: number[]
      push: { configured: boolean; public_key: string | null }
      household: { id: number; name: string }[]
    }>
  >()
  const errors = props.errors ?? {}
  const form = useForm({
    display_name: props.settings.display_name ?? "",
    reduced_motion: props.settings.reduced_motion,
    anchor: props.settings.anchor ?? "",
    treat: props.settings.treat ?? "",
    reminder_enabled: props.settings.reminder_enabled,
    reminder_hour: props.settings.reminder_hour,
    reminder_email: props.settings.reminder_email,
  })
  const [confirmReset, setConfirmReset] = useState(false)
  const [newMember, setNewMember] = useState("")
  const [pushState, setPushState] = useState<"checking" | "unsupported" | "off" | "on" | "denied" | "busy" | "failed">("checking")

  // Is this device already subscribed? (Browser-only, so it runs after render.)
  useEffect(() => {
    if (!props.push.configured) return
    if (!pushSupported()) return setPushState("unsupported")
    if (Notification.permission === "denied") return setPushState("denied")
    currentSubscription().then((s) => setPushState(s ? "on" : "off")).catch(() => setPushState("unsupported"))
  }, [props.push.configured])

  const togglePush = async () => {
    if (!props.push.public_key) return
    if (pushState === "on") {
      setPushState("busy")
      await disablePush()
      return setPushState("off")
    }
    setPushState("busy")
    const result = await enablePush(props.push.public_key).catch(() => "failed" as const)
    setPushState(result === "enabled" ? "on" : result)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    form.patch("/settings", { preserveScroll: true })
  }

  return (
    <>
      <Head title="Settings">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Settings" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader title="Settings" description="Make Nest Quest fit you." />

        <form onSubmit={submit} className="mt-8 max-w-md space-y-6">
          <div className="space-y-2">
            <label htmlFor="display-name">Display name</label>
            <Input
              id="display-name"
              value={form.data.display_name}
              maxLength={40}
              aria-invalid={!!errors.display_name}
              onChange={(e) => form.setData("display_name", e.target.value)}
            />
            {errors.display_name && <p className="text-xs text-danger-display">{errors.display_name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="anchor">When do you usually have a quiet few minutes?</label>
            <Select id="anchor" value={form.data.anchor} onChange={(e) => form.setData("anchor", e.target.value)}>
              <option value="">No preference</option>
              {props.anchors.map((a) => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </Select>
            <p className="caption">Used as the default when you plan when to do your one thing.</p>
            {errors.anchor && <p className="text-xs text-danger-display">{errors.anchor}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="treat">A treat to pair with chores</label>
            <Input
              id="treat"
              value={form.data.treat}
              maxLength={60}
              placeholder="A favourite podcast"
              aria-invalid={!!errors.treat}
              onChange={(e) => form.setData("treat", e.target.value)}
            />
            <p className="caption">Shown as a gentle reminder when you start a task.</p>
            {errors.treat && <p className="text-xs text-danger-display">{errors.treat}</p>}
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 font-normal text-ink-body">
              <Checkbox
                className="mt-1"
                checked={form.data.reminder_enabled}
                onChange={(e) => form.setData("reminder_enabled", e.target.checked)}
              />
              <span>
                Remind me of one tiny thing each day
                <span className="block text-sm text-ink-muted">
                  One short reminder at the time you pick. If you've already done something that day, we won't send it.
                </span>
              </span>
            </label>
            {form.data.reminder_enabled && (
              <div className="space-y-3 pl-8">
                <label className="flex items-start gap-3 font-normal text-ink-body">
                  <Checkbox
                    className="mt-1"
                    checked={form.data.reminder_email}
                    onChange={(e) => form.setData("reminder_email", e.target.checked)}
                  />
                  <span>By email</span>
                </label>
                {props.push.configured && (
                  <div className="space-y-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pushState === "checking" || pushState === "busy" || pushState === "unsupported" || pushState === "denied"}
                      onClick={togglePush}
                    >
                      {pushState === "on" ? "Stop notifying this device" : "Notify this device"}
                    </Button>
                    <p className="caption" aria-live="polite">
                      {pushState === "on" && "This device will get a gentle notification."}
                      {pushState === "off" && "Get a gentle notification on this phone or computer."}
                      {pushState === "denied" && "Notifications are blocked for this site in your browser settings."}
                      {pushState === "unsupported" && "This browser can't show notifications. On iPhone, add Nest Quest to your home screen first."}
                      {pushState === "failed" && "That didn't work. Please try again."}
                    </p>
                  </div>
                )}
              </div>
            )}
            {form.data.reminder_enabled && (
              <div className="space-y-2 pl-8">
                <label htmlFor="reminder-hour">Send it around</label>
                <Select
                  id="reminder-hour"
                  value={String(form.data.reminder_hour)}
                  onChange={(e) => form.setData("reminder_hour", Number(e.target.value))}
                >
                  {props.reminder_hours.map((h) => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 font-normal text-ink-body">
            <Checkbox
              className="mt-1"
              checked={form.data.reduced_motion}
              onChange={(e) => form.setData("reduced_motion", e.target.checked)}
            />
            <span>
              Reduce motion
              <span className="block text-sm text-ink-muted">Turns off animations, even if your device allows them.</span>
            </span>
          </label>

          <Button type="submit" disabled={form.processing}>Save settings</Button>
        </form>

        <section className="mt-12 max-w-md" aria-label="Household">
          <h2>Household</h2>
          <p className="caption mt-1">
            Add the people you share chores with. Then you can give a chore to someone, or have it take turns. They share
            your account (there are no separate logins).
          </p>
          {props.household.length > 0 && (
            <ul className="mt-3 list-none divide-y divide-hairline p-0">
              {props.household.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1">{m.name}</span>
                  <Button size="sm" variant="ghost" aria-label={`Remove ${m.name}`} onClick={() => router.delete(`/household_members/${m.id}`, { preserveScroll: true })}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              router.post("/household_members", { name: newMember }, { preserveScroll: true, onSuccess: () => setNewMember("") })
            }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <label htmlFor="new-member">Add a person</label>
              <Input id="new-member" value={newMember} maxLength={40} placeholder="Sam" aria-invalid={!!errors.household} onChange={(e) => setNewMember(e.target.value)} />
              {errors.household && <p className="text-xs text-danger-display">{errors.household}</p>}
            </div>
            <Button type="submit" variant="secondary" disabled={newMember.trim() === ""}>Add</Button>
          </form>
        </section>

        <section className="mt-12 max-w-xl" aria-label="How this works">
          <h2>How this works</h2>
          <p className="mt-2">
            Nest Quest uses a few well-known habit ideas, always kindly. Here is exactly what it does, and what it never will.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong>One thing at a time.</strong> Today shows a single suggested quest so you aren't facing a long list.</li>
            <li><strong>Plan when, not just what.</strong> Choosing a moment ("after dinner") makes it far more likely you'll start.</li>
            <li><strong>Starting counts.</strong> The 2-minute button earns a little XP, and stopping early is fine.</li>
            <li><strong>Flexible weeks.</strong> The week ring aims for 4 active days. A quiet day never resets anything.</li>
            <li><strong>Milestones, not chance.</strong> Badges unlock at fixed targets and are never taken away.</li>
            <li><strong>Never:</strong> streaks that reset, countdown timers, random prizes, or guilt messages.</li>
          </ul>
          <p className="mt-3">
            See your <Link href="/achievements">badges</Link> any time.
          </p>
        </section>

        <section className="mt-12 max-w-md" aria-label="Suggested chores">
          <h2>Suggested chores</h2>
          <p className="mt-2">Add more of the usual housework for any room, with sensible frequencies.</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/add-chores/rooms">Add suggested chores</Link>
          </Button>
        </section>

        <section className="mt-12 max-w-md" aria-label="Reset">
          <h2>Reset game data</h2>
          <p className="mt-2">
            Deletes your tasks, routines, XP, coins and cottage, then restarts the welcome flow. Your account stays.
          </p>
          <Button className="mt-4" variant="danger" onClick={() => setConfirmReset(true)}>Reset my game data</Button>
        </section>

        <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Reset everything?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => router.post("/settings/reset")}>Yes, reset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </>
  )
}
