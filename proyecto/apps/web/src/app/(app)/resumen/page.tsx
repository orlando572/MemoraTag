import type { Metadata } from 'next';
import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { getAppContext } from '@/features/organization/session';

export const metadata: Metadata = { title: 'Resumen' };

export default async function ResumenPage() {
  const ctx = await getAppContext();
  const name = ctx.ok ? ctx.organization?.name : undefined;
  return (
    <>
      <PageHeader title="Resumen" description={name ? `Lo más importante de ${name}, de un vistazo.` : 'Lo más importante de tu empresa, de un vistazo.'} />
      <EmptyState
        icon={Activity}
        badge="En preparación"
        title="Aquí verás el pulso de tu empresa"
        description="Totales por estado, incidencias abiertas y la actividad reciente de tu equipo aparecerán en esta pantalla."
      />
    </>
  );
}
