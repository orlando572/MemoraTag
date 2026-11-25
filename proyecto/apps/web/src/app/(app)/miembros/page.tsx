import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getAppContext } from '@/features/organization/session';

export const metadata: Metadata = { title: 'Miembros' };

export default async function MiembrosPage() {
  const ctx = await getAppContext();
  // Members are managed by admins only.
  if (!ctx.ok || ctx.role !== 'admin') redirect('/resumen');
  return (
    <>
      <PageHeader title="Miembros" description="Quién forma parte de tu empresa y qué puede hacer." />
      <EmptyState
        icon={Users}
        badge="En preparación"
        title="Aquí gestionarás a tu equipo"
        description="Añadirás personas por correo, cambiarás su rol entre administrador y miembro, y las quitarás cuando haga falta."
      />
    </>
  );
}
