import { Head, Link, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { BirdSays } from "@/components/ui/bird-says"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION = "Nest Quest reminder emails are switched off. You can turn them back on any time in Settings."

export default function Unsubscribed() {
  const { props } = usePage<PageProps<{ done: boolean }>>()
  return (
    <>
      <Head title="Reminders">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Reminders" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <main className="mx-auto max-w-md px-6 py-16">
        <h1>{props.done ? "No more reminders" : "That link has expired"}</h1>
        <BirdSays className="mt-6">
          <p>
            {props.done
              ? "All done. You won't get reminder emails any more. You can turn them back on in Settings whenever you like."
              : "We couldn't match that link. You can switch reminders off any time in Settings."}
          </p>
        </BirdSays>
        <Button asChild className="mt-6">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </main>
    </>
  )
}
