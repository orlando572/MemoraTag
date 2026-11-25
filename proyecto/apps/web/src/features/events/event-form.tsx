'use client';

import type { EventType } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { eventTypes } from './event-types';

// Photo and document events need file upload, which is not available yet.
const selectable: EventType[] = ['note', 'issue', 'maintenance', 'resolved'];

export function EventForm({ objectId, disabled }: { objectId: string; disabled: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<EventType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await browserApi().objects.addEvent(objectId, {
        type,
        title: title.trim(),
        description,
        event_date: date ? new Date(`${date}T12:00:00`).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setDate('');
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure, { 409: 'Este objeto está archivado y ya no admite eventos.' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-muted p-5">
      <h3 className="font-heading text-lg font-semibold tracking-tight">Registrar evento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ev-type">Tipo</Label>
          <Select id="ev-type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {selectable.map((key) => (
              <option key={key} value={key}>
                {eventTypes[key].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-date">Fecha (opcional)</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-title">Título</Label>
        <Input id="ev-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué ha pasado" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-desc">Descripción</Label>
        <Textarea id="ev-desc" maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <Button type="submit" disabled={busy || disabled || !title.trim()}>
        <Plus aria-hidden />
        {busy ? 'Guardando…' : 'Registrar'}
      </Button>
    </form>
  );
}
