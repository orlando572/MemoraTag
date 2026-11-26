'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { LoaderCircle, Pencil } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Field, RequiredNote } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

export function CompanyCard({ orgId, name, isAdmin }: { orgId: string; name: string; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    setError(null);
    if (next.length < 1 || next.length > 80) {
      setNameError(next.length < 1 ? 'Escribe el nombre de la empresa.' : 'El nombre no puede pasar de 80 caracteres.');
      return document.getElementById('company-name')?.focus();
    }
    setNameError(null);
    setBusy(true);
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
        <form onSubmit={save} noValidate className="mt-6 space-y-4">
          <Field id="company-name" label="Nombre de la empresa" required error={nameError}>
            {(p) => <Input {...p} maxLength={80} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />}
          </Field>
          <RequiredNote />
          {error ? <ErrorAlert>{error}</ErrorAlert> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setError(null);
                setNameError(null);
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
