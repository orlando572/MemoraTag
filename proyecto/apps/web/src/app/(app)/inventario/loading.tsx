import { PageHeaderSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,200px))]">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </>
  );
}
