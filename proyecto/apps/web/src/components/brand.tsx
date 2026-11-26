import { Tag } from 'lucide-react';

// Own wordmark: tag icon in a primary tile + Fraunces name.
export function Brand({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Tag className="size-5" aria-hidden />
      </span>
      <span className="font-heading text-xl font-semibold tracking-tight">MemoraTag</span>
    </span>
  );
}
