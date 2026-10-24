export type AttendanceEvent = { actor: string; participant: string; occurrence: string; kind: string; at_ms: number; joined_ms: number | null }
export type PresenceInterval = [number, number | null]
// Sort by provider time, not delivery time. Separate devices are merged before billing.
export function presenceIntervals(events: AttendanceEvent[], actor: string): PresenceInterval[] {
  const result: PresenceInterval[] = []
  const groups = new Map<string, AttendanceEvent[]>()
  for (const event of events.filter(e => e.actor === actor)) {
    const key = event.occurrence + ':' + event.participant
    groups.set(key, [...(groups.get(key) || []), event])
  }
  for (const group of groups.values()) {
    const occurrence = group[0].occurrence
    const ends = events.filter(e => e.kind === 'end' && e.occurrence === occurrence).map(e => e.at_ms)
    const meetingEnd = ends.length ? Math.max(...ends) : null
    let open: number | null = null
    for (const event of group.sort((a,b) => a.at_ms-b.at_ms || (a.kind === 'join' ? -1 : 1))) {
      if (event.kind === 'join') open ??= event.at_ms
      if (event.kind === 'leave') {
        const start = open ?? event.joined_ms
        if (start !== null && event.at_ms >= start) result.push([start, meetingEnd===null ? event.at_ms : Math.max(start,Math.min(event.at_ms,meetingEnd))])
        open = null
      }
    }
    if (open !== null) result.push([open, meetingEnd === null ? null : Math.max(open, meetingEnd)])
  }
  return result
}
export function presenceMinutes(intervals: PresenceInterval[], start: number, end: number, now: number) {
  const ranges = intervals.map(([a,b]) => [Math.max(a,start), Math.min(b ?? now,end,now)])
    .filter(([a,b]) => b>a).sort((a,b) => a[0]-b[0])
  let total = 0, until = -Infinity
  for (const [a,b] of ranges) { total += Math.max(0,b-Math.max(a,until)); until = Math.max(until,b) }
  return total/60000
}
