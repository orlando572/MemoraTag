import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function ObjectNotFound() {
  return (
    <EmptyState icon={PackageSearch} title="Este objeto no existe o ya no tienes acceso" description="Puede que lo hayan eliminado o que el enlace no sea correcto.">
      <Button asChild>
        <Link href="/inventario">Volver al inventario</Link>
      </Button>
    </EmptyState>
  );
}
