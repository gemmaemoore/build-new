import * as React from "react"
import { usePage } from "@inertiajs/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MonsterArt } from "@/components/ui/monster-art"
import { Confetti } from "@/components/quest/Confetti"
import { FocusMode } from "@/components/quest/FocusMode"

import type { PageProps, Victory } from "@/types/inertia"

const ordinal = (n: number) => {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`
}

// Shown after a quest is completed. The server sends the payload once as
// flash.victory; the animation is CSS-only and disabled for reduced motion.
export function VictoryDialog() {
  const { props } = usePage<PageProps>()
  const victory = props.flash?.victory ?? null
  const [shownId, setShownId] = React.useState<number | null>(null)
  const [focusing, setFocusing] = React.useState<NonNullable<Victory["next_quest"]> | null>(null)
  const open = victory !== null && shownId !== victory.id

  const focusEl = focusing ? (
    <FocusMode
      target={{ task_id: focusing.id, monster_key: focusing.monster_key, title: focusing.title, quest_title: focusing.fantasy_title, minutes: focusing.minutes, steps: [] }}
      onClose={() => setFocusing(null)}
    />
  ) : null

  if (!victory) return focusEl
  const rare = victory.surprise?.rare ?? false

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && setShownId(victory.id)}>
        <DialogContent size="sm">
          <Confetti />
          {rare && <Confetti />}
          <DialogHeader>
            <div className="flex justify-center">
              {victory.monster_key ? (
                <MonsterArt monster={victory.monster_key} mood="sleepy" className="h-24 w-24" />
              ) : (
                <div className="victory-poof" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
            <DialogTitle>{victory.monster} defeated!</DialogTitle>
            <DialogDescription>
              {victory.message}
            </DialogDescription>
          </DialogHeader>
          <p className="caption">
            {victory.quest_title}: "{victory.task_title}"
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="signal">+{victory.xp} XP</Badge>
            <Badge tone="signal">+{victory.coins} coins</Badge>
          </div>
          {victory.surprise && (
            <div className={`surprise-card mt-3 ${victory.surprise.rare ? "rare" : ""}`} role="status">
              <p>
                <strong>{victory.surprise.rare ? "A rare find! " : "A happy surprise! "}</strong>
                {victory.surprise.message}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {victory.surprise.coins > 0 && <Badge tone="signal">+{victory.surprise.coins} coins</Badge>}
                {victory.surprise.xp > 0 && <Badge tone="signal">+{victory.surprise.xp} XP</Badge>}
                {victory.surprise.gift && <Badge tone="accent">{victory.surprise.gift} for your cottage</Badge>}
              </div>
            </div>
          )}
          <p className="mt-3 caption">
            {ordinal(victory.wins_today)} win today · {victory.xp_to_next} XP to level {victory.level + 1}
          </p>
          {victory.leveled_up && (
            <p className="mt-3">
              <strong>Level up!</strong> You reached level {victory.level}.
            </p>
          )}
          {victory.badges.map((b) => (
            <p key={b.key} className="mt-3">
              <strong>New badge: {b.name}.</strong> {b.description}
            </p>
          ))}
          {victory.next_quest && (
            <div className="mt-4 rounded-xl border border-hairline bg-surface p-3">
              <p className="caption">Keep the glow going?</p>
              <p><strong>{victory.next_quest.title}</strong></p>
              <p className="caption">about {victory.next_quest.minutes} min · +{victory.next_quest.xp} XP</p>
              <Button
                className="mt-2"
                size="sm"
                onClick={() => {
                  setFocusing(victory.next_quest)
                  setShownId(victory.id)
                }}
              >
                Do this one next
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant={victory.next_quest ? "secondary" : "primary"} onClick={() => setShownId(victory.id)}>
              {victory.next_quest ? "That's enough for now" : "Lovely"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {focusEl}
    </>
  )
}
