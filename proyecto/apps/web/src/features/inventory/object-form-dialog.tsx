'use client';

import type { InventoryObject, InventoryStatus } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useToast } from '@/features/toast/toast';
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <DialogTitle>{editing ? 'Editar objeto' : 'Nuevo objeto'}</DialogTitle>
        <DialogDescription>{editing ? 'Actualiza los datos de inventario.' : 'Añade un objeto al inventario de tu empresa.'}</DialogDescription>
      </div>
      <div className="space-y-2">
        <Label htmlFor="obj-name">Nombre</Label>
        <Input id="obj-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taladro de columna" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="obj-desc">Descripción</Label>
        <Textarea id="obj-desc" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Color</legend>
        <div className="flex flex-wrap gap-2">
          {objectColors.map((item, i) => {
            const selected = item.key === colorKey;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
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
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="obj-code">Código interno</Label>
          <Input id="obj-code" maxLength={200} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obj-cat">Categoría</Label>
          <Input id="obj-cat" maxLength={200} value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obj-loc">Ubicación</Label>
          <Input id="obj-loc" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obj-asg">Responsable</Label>
          <Input id="obj-asg" maxLength={200} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        </div>
      </div>
      {editing ? null : (
        <div className="space-y-2">
          <Label htmlFor="obj-status">Estado</Label>
          <Select id="obj-status" value={status} onChange={(e) => setStatus(e.target.value as InventoryStatus)}>
            {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => (
              <option key={key} value={key}>
                {inventoryStatuses[key].label}
              </option>
            ))}
          </Select>
        </div>
      )}
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear objeto'}
        </Button>
      </div>
    </form>
  );
}
