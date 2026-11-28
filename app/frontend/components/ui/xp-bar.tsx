// XP bar: level, progress to the next level, and coin balance.
import * as React from "react"
import { cn } from "@/lib/utils"

export interface XpBarProps extends React.HTMLAttributes<HTMLDivElement> {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  coins: number
}

const XpBar = React.forwardRef<HTMLDivElement, XpBarProps>(
  ({ level, xpIntoLevel, xpForNextLevel, coins, className, ...props }, ref) => {
    const percent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    return (
      <div ref={ref} className={cn("flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-2", className)} {...props}>
        <p className="shrink-0">
          <strong>Level {level}</strong>
        </p>
        <div className="min-w-0 flex-1">
          <div
            className="h-2 overflow-hidden rounded-full bg-hairline"
            role="progressbar"
            aria-label={`Level ${level} progress`}
            aria-valuemin={0}
            aria-valuemax={xpForNextLevel}
            aria-valuenow={xpIntoLevel}
          >
            <div className="h-full rounded-full bg-accent-strong transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1 caption">
            {xpIntoLevel} / {xpForNextLevel} XP to level {level + 1}
          </p>
        </div>
        <p className="shrink-0">
          <strong>{coins}</strong> coins
        </p>
      </div>
    )
  },
)
XpBar.displayName = "XpBar"

export { XpBar }
