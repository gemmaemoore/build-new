// Nest Quest service worker: shows gentle push reminders and opens the app when
// one is tapped. It does no caching, so the app is always fresh.
self.addEventListener("push", (event) => {
  if (!event.data) return
  const { title, options } = event.data.json()
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const path = (event.notification.data && event.notification.data.path) || "/"
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).pathname === path && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(path)
    })
  )
})
