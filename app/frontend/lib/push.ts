// Browser push helpers (client only; never call during render).

const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

// The VAPID public key arrives base64url-encoded; the browser wants bytes.
function keyBytes(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.register("/service-worker")
  await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function enablePush(publicKey: string): Promise<"enabled" | "denied" | "failed"> {
  if ((await Notification.requestPermission()) !== "granted") return "denied"
  const registration = await navigator.serviceWorker.register("/service-worker")
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
  const response = await fetch("/push_subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf(), Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  return response.ok ? "enabled" : "failed"
}

export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await fetch("/push_subscription", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf(), Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  await subscription.unsubscribe()
}
