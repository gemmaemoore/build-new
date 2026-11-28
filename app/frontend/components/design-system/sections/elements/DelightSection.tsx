import { SectionShell } from "@/components/design-system/SectionShell"
import { BirdSays } from "@/components/ui/bird-says"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/Logo"

const code = `{/* The bird guides with a short, kind bubble */}
<BirdSays><p>A fresh week. Pick one small thing.</p></BirdSays>

{/* A random find after a win (add "rare" for a golden one) */}
<div className="surprise-card" role="status">…</div>

{/* Big countdown numbers (tidy blitz) */}
<p role="timer" className="timer-readout">10:00</p>`

export function DelightSection() {
  return (
    <SectionShell
      id="delight"
      title="Delight"
      description={<>The small joyful pieces: the bird guide, happy surprises and the big timer. They are bonuses, never penalties, and the motion in them switches off for reduced motion.</>}
      whenToUse={
        <ul>
          <li><strong>BirdSays</strong> for one short, warm message such as a fresh start. One idea per bubble.</li>
          <li><strong>.surprise-card</strong> for a random find after a win; add <code>rare</code> for the golden version.</li>
          <li><strong>.timer-readout</strong> for a countdown the whole screen is about.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>Never use the bird to scold, count missed days or nag.</li>
          <li>Surprises are always extra: never take something away or hide a basic feature behind luck.</li>
        </ul>
      }
      preview={
        <div className="max-w-md space-y-5">
          <BirdSays><p>A fresh week. Pick one small thing and see how it feels.</p></BirdSays>
          <div className="surprise-card" role="status">
            <div className="flex items-start gap-3">
              <LogoMark className="bird-bob h-10 w-10 shrink-0" />
              <p><strong>A happy surprise! </strong>The bird found a lucky button under the sofa!</p>
            </div>
            <div className="mt-2 flex gap-2"><Badge tone="signal">+8 coins</Badge></div>
          </div>
          <div className="flex items-center gap-4">
            <p className="timer-readout" role="timer" aria-label="Example timer">10:00</p>
            <Button size="sm">Start the blitz</Button>
          </div>
        </div>
      }
      code={code}
    />
  )
}
