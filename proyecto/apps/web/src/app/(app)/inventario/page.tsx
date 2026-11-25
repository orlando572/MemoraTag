import type { Metadata } from 'next';
import { Boxes } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Inventario' };

export default function InventarioPage() {
  return (
    <>
      <PageHeader title="Inventario" description="Todo lo que tu empresa cuida, con su historia." />
      <EmptyState
        icon={Boxes}
        badge="En preparación"
        title="Tu inventario aparecerá aquí"
        description="Podrás buscar, filtrar por estado y ubicación, ver la historia de cada objeto y exportar la lista."
      />
    </>
  );
}
