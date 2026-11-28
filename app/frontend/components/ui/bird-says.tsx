// The nest bird as a guide: a friendly speech bubble for short, kind messages
// (fresh starts, lucky finds). One idea per bubble, never a scolding.
import * as React from "react"
import { LogoMark } from "@/components/Logo"
import { cn } from "@/lib/utils"

export function BirdSays({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)} role="status">
      <LogoMark className="bird-bob h-12 w-12 shrink-0" />
      <div className="speech-bubble flex-1">{children}</div>
    </div>
  )
}
