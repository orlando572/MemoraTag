import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <Brand />
      <span className="mt-12 flex size-14 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Compass className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 font-heading text-4xl font-semibold tracking-[-0.03em]">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-muted-foreground">La dirección no existe o ha cambiado de sitio.</p>
      <Button asChild className="mt-8">
        <Link href="/resumen">Ir al resumen</Link>
      </Button>
    </main>
  );
}
