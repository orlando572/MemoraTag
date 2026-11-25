'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Brand } from '@/components/brand';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { browserApi } from '@/lib/api-client';

export function CreateOrganization() {
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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Brand />
      <h1 className="mt-12 text-center font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">Crea tu empresa</h1>
      <p className="mt-3 max-w-md text-center text-lg text-muted-foreground">
        Será el espacio donde tu equipo gestiona el inventario. Serás su administrador.
      </p>
      <form onSubmit={onSubmit} className="mt-10 w-full max-w-[440px] space-y-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre de la empresa</Label>
          <Input id="org-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Taller Demo" />
        </div>
        {error ? <ErrorAlert>{error}</ErrorAlert> : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>
          {busy ? 'Creando…' : 'Crear empresa'}
        </Button>
      </form>
    </main>
  );
}
