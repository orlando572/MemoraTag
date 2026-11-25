'use client';

import type { EventType } from '@memoratag/contracts';
import { useState } from 'react';
import type { WebEvent } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EventAttachments } from './event-attachments';
import { eventTypes } from './event-types';
import { toneClasses } from './tone';

export function EventIcon({ type }: { type: EventType }) {
  const { icon: Icon, tone } = eventTypes[type];
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', toneClasses[tone])}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

const filterLabels: Record<EventType, string> = {
  note: 'Notas',
  issue: 'Incidencias',
  maintenance: 'Mantenimiento',
  resolved: 'Resueltas',
  photo: 'Fotos',
  document: 'Documentos',
};
const order = Object.keys(filterLabels) as EventType[];

type Props = { events: WebEvent[]; isAdmin?: boolean; currentUserId?: string };

export function EventTimeline({ events, isAdmin = false, currentUserId }: Props) {
  const [selected, setSelected] = useState<EventType | 'all'>('all');

  if (events.length === 0) {
    return <p className="rounded-lg border border-dashed border-border px-5 py-8 text-center text-muted-foreground">Aún no hay eventos. Registra el primero con el botón de arriba.</p>;
  }

  const counts = new Map<EventType, number>();
  events.forEach((event) => counts.set(event.type, (counts.get(event.type) ?? 0) + 1));
  const present = order.filter((type) => counts.has(type));
  // If the chosen type has no events left (e.g. after deleting), fall back to all.
  const active = selected !== 'all' && counts.has(selected) ? selected : 'all';
  const visible = active === 'all' ? events : events.filter((event) => event.type === active);

  const chips: { key: EventType | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: events.length },
    ...present.map((type) => ({ key: type, label: filterLabels[type], count: counts.get(type) ?? 0 })),
  ];

  return (
    <div>
      {present.length > 1 ? (
        <div role="group" aria-label="Filtrar la historia por tipo" className="mb-6 flex flex-wrap gap-2">
          {chips.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              aria-pressed={active === key}
              onClick={() => setSelected(key)}
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                active === key ? 'border-transparent bg-accent text-accent-foreground' : 'border-input bg-surface text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {label}
              <span className="text-xs opacity-80">{count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ol className="space-y-6">
        {visible.map((event) => {
          const author = event.created_by === currentUserId ? 'Tú' : event.created_by_email;
          return (
            <li key={event.id} className="flex gap-4">
              <EventIcon type={event.type} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {eventTypes[event.type].label} · {formatDateTime(event.created_at)}
                  {author ? ` · ${author}` : ''}
                  {event.event_date ? ` · Fecha del suceso: ${formatDate(event.event_date)}` : ''}
                </p>
                <p className="font-semibold">{event.title}</p>
                {event.description ? <p className="mt-1 whitespace-pre-line text-muted-foreground">{event.description}</p> : null}
                <EventAttachments files={event.files} isAdmin={isAdmin} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
