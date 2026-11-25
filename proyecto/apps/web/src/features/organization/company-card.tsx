'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

export function CompanyCard({ orgId, name, isAdmin }: { orgId: string; name: string; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (next.length < 1 || next.length > 80) return setError('El nombre debe tener entre 1 y 80 caracteres.');
    setBusy(true);
    setError(null);
    try {
      await browserApi().organizations.rename(orgId, next);
      toast('Nombre actualizado');
      setEditing(false);
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Empresa</CardTitle>
      {editing ? (
        <form onSubmit={save} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nombre de la empresa</Label>
            <Input id="company-name" required maxLength={80} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </div>
          {error ? <ErrorAlert>{error}</ErrorAlert> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !value.trim()}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Nombre</p>
            <p className="mt-1 text-lg font-semibold">{name}</p>
          </div>
          {isAdmin ? (
            <Button
              variant="secondary"
              onClick={() => {
                setValue(name);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden />
              Editar
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
