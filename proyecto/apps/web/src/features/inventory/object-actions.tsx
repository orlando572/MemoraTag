'use client';

import type { InventoryObject, InventoryStatus } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { ObjectFormDialog } from './object-form-dialog';
import { inventoryStatuses } from './status';

const archivedMessage = { 409: 'Este objeto está archivado y ya no se puede modificar.' };

export function StatusControl({ id, status, disabled }: { id: string; status: InventoryStatus; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: InventoryStatus) {
    if (next === status) return;
    setBusy(true);
    setError(null);
    try {
      await browserApi().objects.changeStatus(id, { status: next });
      toast('Estado actualizado');
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure, archivedMessage));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Estado del objeto" className="grid gap-2">
        {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => {
          const { label, icon: Icon } = inventoryStatuses[key];
          const active = key === status;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled || busy}
              onClick={() => change(key)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-md border px-4 text-sm font-semibold transition-colors disabled:opacity-60',
                active ? 'border-transparent bg-accent text-accent-foreground' : 'border-input bg-surface text-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {error ? <ErrorAlert className="mt-3">{error}</ErrorAlert> : null}
    </div>
  );
}

export function EditObjectButton({ orgId, object }: { orgId: string; object: InventoryObject }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden />
        Editar
      </Button>
      <ObjectFormDialog open={open} onOpenChange={setOpen} orgId={orgId} object={object} />
    </>
  );
}

export function ArchiveObjectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)} className="w-full">
        <Archive aria-hidden />
        Archivar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Archivar este objeto?"
        description={`«${name}» dejará de aparecer en el inventario y ya no se podrá modificar.`}
        confirmLabel="Archivar"
        errorOverrides={archivedMessage}
        onConfirm={async () => {
          await browserApi().objects.archive(id);
          toast('Objeto archivado');
          router.replace('/inventario');
          router.refresh();
        }}
      />
    </>
  );
}

export function RestoreObjectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArchiveRestore aria-hidden />
        Restaurar
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="default"
        title="¿Restaurar este objeto?"
        description={`«${name}» volverá al inventario y se podrá editar de nuevo.`}
        confirmLabel="Restaurar"
        onConfirm={async () => {
          await browserApi().objects.restore(id);
          toast('Objeto restaurado');
          router.refresh();
        }}
      />
    </>
  );
}
