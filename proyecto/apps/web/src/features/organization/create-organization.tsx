'use client';

import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, RequiredNote } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setNameError('Escribe el nombre de tu empresa.');
      return document.getElementById('org-name')?.focus();
    }
    setNameError(null);
    setBusy(true);
    try {
      await browserApi().organizations.create({ name: name.trim() });
      router.replace('/resumen');
      router.refresh();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'No se pudo crear la empresa.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-[440px] space-y-6 rounded-xl border border-border bg-card p-6 md:p-8">
      <Field id="org-name" label="Nombre de la empresa" required error={nameError}>
        {(p) => <Input {...p} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taller Demo" />}
      </Field>
      <RequiredNote />
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
        {busy ? 'Creando…' : 'Crear empresa'}
      </Button>
    </form>
  );
}
