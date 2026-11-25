'use client';

import type { EventType } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Paperclip, Plus, RotateCcw, X } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { eventTypes } from './event-types';
import { ACCEPT, formatBytes, validateFile } from './files';

const selectable: EventType[] = ['note', 'issue', 'maintenance', 'resolved', 'photo', 'document'];

type Picked = { key: string; file: File; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string };

const uploadErrors = {
  400: 'el tipo o el contenido del archivo no es válido',
  413: 'supera el máximo de 5 MB',
  409: 'el objeto está archivado',
  404: 'no se encontró el evento',
};

export function EventForm({ objectId, disabled, onSaved }: { objectId: string; disabled: boolean; onSaved?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<EventType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [files, setFiles] = useState<Picked[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  // Set once the event exists: from then on only the failed uploads can be retried or discarded.
  const [eventId, setEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const needsFile = type === 'photo' || type === 'document';
  const failed = files.filter((f) => f.status === 'error');

  function addFiles(list: FileList | File[]) {
    const accepted: Picked[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const problem = validateFile(file);
      if (problem) problems.push(`${file.name}: ${problem}`);
      else accepted.push({ key: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, status: 'pending' });
    }
    setRejected(problems);
    setFiles((current) => [...current, ...accepted]);
  }

  function patch(key: string, changes: Partial<Picked>) {
    setFiles((current) => current.map((f) => (f.key === key ? { ...f, ...changes } : f)));
  }

  function reset() {
    setTitle('');
    setDescription('');
    setDate('');
    setFiles([]);
    setRejected([]);
    setEventId(null);
    setError(null);
  }

  // Everything saved: clear the form, notify and let the parent fold it.
  function finish() {
    toast(files.length > 0 ? 'Evento y archivos guardados' : 'Evento registrado');
    reset();
    onSaved?.();
  }

  async function upload(id: string, items: Picked[]) {
    const api = browserApi();
    let failures = 0;
    for (const item of items) {
      patch(item.key, { status: 'uploading', error: undefined });
      try {
        await api.files.upload(id, item.file);
        patch(item.key, { status: 'done' });
      } catch (failure) {
        failures++;
        patch(item.key, { status: 'error', error: errorMessage(failure, uploadErrors) });
      }
    }
    return failures;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (needsFile && files.length === 0) return setError(`Un evento de tipo «${eventTypes[type].label}» necesita al menos un archivo.`);
    setBusy(true);
    setError(null);
    try {
      const created = await browserApi().objects.addEvent(objectId, {
        type,
        title: title.trim(),
        description,
        event_date: date ? new Date(`${date}T12:00:00`).toISOString() : null,
      });
      setEventId(created.id);
      router.refresh();
      const failures = await upload(created.id, files);
      router.refresh();
      if (failures === 0) finish();
    } catch (failure) {
      setError(errorMessage(failure, { 409: 'Este objeto está archivado y ya no admite eventos.' }));
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!eventId) return;
    setBusy(true);
    const failures = await upload(eventId, failed);
    router.refresh();
    setBusy(false);
    if (failures === 0) finish();
  }

  const locked = eventId !== null;
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-muted p-5">
      <h3 className="font-heading text-lg font-semibold tracking-tight">Registrar evento</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ev-type">Tipo</Label>
          <Select id="ev-type" value={type} disabled={locked} onChange={(e) => setType(e.target.value as EventType)}>
            {selectable.map((key) => (
              <option key={key} value={key}>
                {eventTypes[key].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-date">Fecha (opcional)</Label>
          <Input id="ev-date" type="date" value={date} disabled={locked} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-title">Título</Label>
        <Input id="ev-title" required maxLength={200} value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} placeholder="Qué ha pasado" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-desc">Descripción</Label>
        <Textarea id="ev-desc" maxLength={4000} value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ev-files">Adjuntos {needsFile ? '(obligatorio)' : '(opcional)'}</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!locked) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!locked) addFiles(e.dataTransfer.files);
          }}
          className={cn('flex flex-col items-center gap-2 rounded-md border border-dashed border-input bg-surface px-4 py-6 text-center', dragging && 'border-primary bg-accent')}
        >
          <Paperclip className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Arrastra fotos o documentos aquí, o</p>
          <Button type="button" variant="secondary" size="sm" disabled={locked} onClick={() => input.current?.click()}>
            Elegir archivos
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, PDF o Excel · máximo 5 MB cada uno</p>
          <input
            ref={input}
            id="ev-files"
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {rejected.length ? (
          <ErrorAlert>
            <span className="block">No se han añadido estos archivos:</span>
            <ul className="mt-1 list-disc pl-5 font-normal">
              {rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </ErrorAlert>
        ) : null}
        {files.length ? (
          <ul className="space-y-2" aria-label="Archivos elegidos">
            {files.map((item) => (
              <li key={item.key} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                  {item.error ? <span className="block text-xs font-semibold text-destructive">No se subió: {item.error}</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground" role="status">
                  {item.status === 'uploading' ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
                  {item.status === 'done' ? <CircleCheck className="size-4 text-success" aria-hidden /> : null}
                  {item.status === 'error' ? <CircleAlert className="size-4 text-destructive" aria-hidden /> : null}
                  {{ pending: 'Pendiente', uploading: 'Subiendo…', done: 'Subido', error: 'Falló' }[item.status]}
                </span>
                {item.status === 'pending' || item.status === 'error' ? (
                  <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Quitar ${item.file.name} de la lista`} disabled={busy} onClick={() => setFiles((c) => c.filter((f) => f.key !== item.key))}>
                    <X className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {locked && failed.length > 0 && !busy ? (
        <ErrorAlert>El evento se guardó, pero {failed.length === 1 ? 'un archivo no se subió' : `${failed.length} archivos no se subieron`}. Puedes reintentarlos o descartarlos.</ErrorAlert>
      ) : null}

      {locked ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={retry} disabled={busy || failed.length === 0}>
            <RotateCcw aria-hidden />
            {busy ? 'Subiendo…' : 'Reintentar'}
          </Button>
          <Button type="button" variant="secondary" onClick={reset} disabled={busy}>
            Descartar fallidos
          </Button>
        </div>
      ) : (
        <Button type="submit" disabled={busy || disabled || !title.trim()}>
          <Plus aria-hidden />
          {busy ? 'Guardando…' : 'Registrar'}
        </Button>
      )}
    </form>
  );
}
