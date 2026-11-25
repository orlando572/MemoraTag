import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { objectColorIndex } from './colors';

export function ObjectAvatar({ color, className }: { color: string; className?: string }) {
  const i = objectColorIndex(color);
  return (
    <span
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', className)}
      style={{ background: `var(--obj-${i}-bg)`, color: `var(--obj-${i}-fg)` }}
    >
      <Package className="size-[55%]" />
    </span>
  );
}
