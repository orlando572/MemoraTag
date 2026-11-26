'use client';

import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState icon={TriangleAlert} title="Algo ha salido mal" description="No pudimos cargar esta pantalla. Comprueba tu conexión e inténtalo de nuevo.">
      <Button onClick={reset}>Reintentar</Button>
    </EmptyState>
  );
}
