import { cn } from '@/lib/utils';

// Placeholder block; the pulse is disabled with prefers-reduced-motion.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-md bg-muted motion-safe:animate-pulse', className)} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-10 md:mb-14" role="status" aria-label="Cargando">
      <Skeleton className="h-10 w-64 md:h-14 md:w-96" />
      <Skeleton className="mt-4 h-6 w-full max-w-md" />
    </div>
  );
}
