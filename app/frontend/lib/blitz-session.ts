// A tidy blitz in progress, kept in this browser so it survives moving between
// screens and reloads. The timer is stored as an end time (or the time left when
// paused), so it keeps counting while you're elsewhere in the app.

const KEY = "nestquest:blitz"
const EVENT = "nestquest:blitz-change"

export type BlitzSession = {
  minutes: number
  /** Chore ids chosen for this blitz. */
  picked: number[]
  /** Epoch ms when time runs out; null while paused or not yet started. */
  endsAt: number | null
  /** Milliseconds left while paused or before starting. */
  remainingMs: number
  cleared: number
  /** Epoch ms when the blitz began (the server counts chores done since then). */
  startedAt: number
  /** True once "Finish now" or time-up has been handled. */
  finished: boolean
}

export function loadBlitz(): BlitzSession | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as BlitzSession) : null
    return parsed && Array.isArray(parsed.picked) && typeof parsed.minutes === "number" ? parsed : null
  } catch {
    return null
  }
}

export function saveBlitz(session: BlitzSession | null) {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session))
    else window.localStorage.removeItem(KEY)
  } catch {
    // storage can be unavailable; the blitz still works on this page
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeBlitz(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export const secondsLeft = (s: BlitzSession, now = Date.now()) =>
  Math.max(0, Math.ceil((s.endsAt === null ? s.remainingMs : s.endsAt - now) / 1000))

export const isRunning = (s: BlitzSession) => s.endsAt !== null && !s.finished

export const clock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
