import type { ObjectEvent } from '@memoratag/contracts';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { eventTypes } from './event-types';
import { toneClasses } from './tone';

export function EventIcon({ type }: { type: ObjectEvent['type'] }) {
  const { icon: Icon, tone } = eventTypes[type];
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', toneClasses[tone])}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function EventTimeline({ events }: { events: ObjectEvent[] }) {
  if (events.length === 0) {
    return <p className="rounded-lg border border-dashed border-border px-5 py-8 text-center text-muted-foreground">Aún no hay eventos. Registra el primero con el formulario.</p>;
  }
  return (
    <ol className="space-y-6">
      {events.map((event) => (
        <li key={event.id} className="flex gap-4">
          <EventIcon type={event.type} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">
              {eventTypes[event.type].label} · {formatDate(event.event_date ?? event.created_at)}
            </p>
            <p className="font-semibold">{event.title}</p>
            {event.description ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{event.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
