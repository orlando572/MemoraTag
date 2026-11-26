'use client';

import type { InventoryObject, InventoryStatus } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, RequiredNote } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { objectColorIndex, objectColors } from './colors';
import { inventoryStatuses } from './status';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; orgId: string; object?: InventoryObject };

const orNull = (value: string) => value.trim() || null;

export function ObjectFormDialog({ open, onOpenChange, orgId, object }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so the form state starts fresh from `object` each time. */}
        <ObjectForm orgId={orgId} object={object} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ObjectForm({ orgId, object, onDone }: { orgId: string; object?: InventoryObject; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(object);
  const [name, setName] = useState(object?.name ?? '');
  const [description, setDescription] = useState(object?.description ?? '');
  const [colorKey, setColorKey] = useState<string>(objectColors[object ? objectColorIndex(object.color) : 0].key);
  const [code, setCode] = useState(object?.internal_code ?? '');
  const [category, setCategory] = useState(object?.category ?? '');
  const [location, setLocation] = useState(object?.location ?? '');
  const [assignee, setAssignee] = useState(object?.assignee ?? '');
  const [status, setStatus] = useState<InventoryStatus>('in_use');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setNameError('Escribe el nombre del objeto.');
      return document.getElementById('obj-name')?.focus();
    }
    setNameError(null);
    setBusy(true);
    const fields = {
      name: name.trim(),
      description,
      color: colorKey,
      internal_code: orNull(code),
      category: orNull(category),
      location: orNull(location),
      assignee: orNull(assignee),
    };
    try {
      const api = browserApi();
      if (object) await api.objects.update(object.id, fields);
      else {
        const created = await api.objects.create(orgId, { ...fields, status });
        router.push(`/inventario/${created.id}`);
      }
      toast(object ? 'Cambios guardados' : 'Objeto creado');
      router.refresh();
      onDone();
    } catch (failure) {
      setError(errorMessage(failure, { 409: 'Este objeto está archivado y ya no se puede modificar.' }));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <DialogTitle>{editing ? 'Editar objeto' : 'Nuevo objeto'}</DialogTitle>
        <DialogDescription>{editing ? 'Actualiza los datos de inventario.' : 'Añade un objeto al inventario de tu empresa.'}</DialogDescription>
      </div>
      <Field id="obj-name" label="Nombre" required error={nameError}>
        {(p) => <Input {...p} maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taladro de columna" />}
      </Field>
      <Field id="obj-desc" label="Descripción">
        {(p) => <Textarea {...p} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>
      <div role="radiogroup" aria-labelledby="obj-color-label" className="space-y-2">
        <p id="obj-color-label" className="text-sm font-semibold">
          Color
        </p>
        <div className="flex flex-wrap gap-2">
          {objectColors.map((item, i) => {
            const selected = item.key === colorKey;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={item.name}
                title={item.name}
                onClick={() => setColorKey(item.key)}
                className={cn('flex size-11 items-center justify-center rounded-md border-2', selected ? 'border-primary' : 'border-transparent hover:border-input')}
                style={{ background: `var(--obj-${i}-bg)`, color: `var(--obj-${i}-fg)` }}
              >
                {selected ? <Check className="size-5" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="obj-code" label="Código interno">
          {(p) => <Input {...p} maxLength={200} value={code} onChange={(e) => setCode(e.target.value)} />}
        </Field>
        <Field id="obj-cat" label="Categoría">
          {(p) => <Input {...p} maxLength={200} value={category} onChange={(e) => setCategory(e.target.value)} />}
        </Field>
        <Field id="obj-loc" label="Ubicación">
          {(p) => <Input {...p} maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />}
        </Field>
        <Field id="obj-asg" label="Responsable">
          {(p) => <Input {...p} maxLength={200} value={assignee} onChange={(e) => setAssignee(e.target.value)} />}
        </Field>
      </div>
      {editing ? null : (
        <Field id="obj-status" label="Estado">
          {(p) => (
            <Select {...p} value={status} onChange={(e) => setStatus(e.target.value as InventoryStatus)}>
              {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => (
                <option key={key} value={key}>
                  {inventoryStatuses[key].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <RequiredNote />
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear objeto'}
        </Button>
      </div>
    </form>
  );
}
