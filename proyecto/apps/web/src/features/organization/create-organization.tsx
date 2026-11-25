'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
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
    <form onSubmit={onSubmit} className="w-full max-w-[440px] space-y-6 rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="space-y-2">
        <Label htmlFor="org-name">Nombre de la empresa</Label>
        <Input id="org-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taller Demo" />
      </div>
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
        {busy ? 'Creando…' : 'Crear empresa'}
      </Button>
    </form>
  );
}
