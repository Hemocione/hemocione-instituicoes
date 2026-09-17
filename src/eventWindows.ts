export type EventSummary = {
  _id: string
  name: string
  slug: string
  startAt: string
  endAt: string
}

export type SubscriberRecord = {
  createdAt: string
  [key: string]: unknown
}

export function isEventOngoing(event: EventSummary, now: Date): boolean {
  return new Date(event.startAt).getTime() <= now.getTime() && now.getTime() <= new Date(event.endAt).getTime()
}

export function pickFeaturedEvent(events: EventSummary[], now: Date): EventSummary | null {
  const ongoing = events.filter((event) => isEventOngoing(event, now))
  if (ongoing.length > 0) {
    return ongoing.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
  }

  const upcoming = events.filter((event) => new Date(event.startAt).getTime() > now.getTime())
  if (upcoming.length > 0) {
    return upcoming.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
  }

  return null
}

export function computeSubscriptionTrend(
  subscribers: SubscriberRecord[],
  now: Date
): { lastHour: number; previousHour: number } {
  const oneHourMs = 60 * 60 * 1000
  const nowMs = now.getTime()

  let lastHour = 0
  let previousHour = 0

  for (const subscriber of subscribers) {
    const createdAtMs = new Date(subscriber.createdAt).getTime()
    const ageMs = nowMs - createdAtMs
    if (ageMs >= 0 && ageMs < oneHourMs) {
      lastHour += 1
    } else if (ageMs >= oneHourMs && ageMs < 2 * oneHourMs) {
      previousHour += 1
    }
  }

  return { lastHour, previousHour }
}
