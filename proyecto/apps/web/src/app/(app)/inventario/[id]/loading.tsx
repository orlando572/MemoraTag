import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Cargando">
      <Skeleton className="mb-6 h-5 w-24" />
      <div className="mb-10 flex items-center gap-5 md:mb-14">
        <Skeleton className="size-16 rounded-lg" />
        <Skeleton className="h-10 w-72 md:h-12" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
