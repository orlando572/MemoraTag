// Pure helpers for the history filters of the object screen. No React Native imports, so
// tests/history-filter.test.mjs can run them.

export const EVENT_TYPE_KEYS = ['note', 'issue', 'maintenance'] as const;
export type EventTypeKey = (typeof EVENT_TYPE_KEYS)[number];
export type EventFilter = 'all' | EventTypeKey;
export type EventCounts = Record<EventFilter, number>;

export function countEvents(events: { type: string }[]): EventCounts {
  const counts: EventCounts = { all: events.length, note: 0, issue: 0, maintenance: 0 };
  for (const event of events) if (event.type in counts && event.type !== 'all') counts[event.type as EventTypeKey]++;
  return counts;
}

/** Types that have at least one event, in the usual order. «Notas 0» would lead to an empty list. */
export function typesWithEvents(counts: EventCounts): EventTypeKey[] {
  return EVENT_TYPE_KEYS.filter((key) => counts[key] > 0);
}

/** Filtering only helps when there are at least two kinds of event to choose between. */
export function showTypeFilters(counts: EventCounts) {
  return typesWithEvents(counts).length >= 2;
}

/**
 * A filter on a type that no longer has events (the last one was deleted or changed) falls back to
 * «Todos». Otherwise it would come back by itself, and hide events, when one is added again.
 */
export function effectiveEventFilter(filter: EventFilter, counts: EventCounts): EventFilter {
  return filter === 'all' || counts[filter] > 0 ? filter : 'all';
}
