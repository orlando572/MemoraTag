import { Nfc } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = {
  /** ISO date the NFC tag was written; empty means no tag. */
  writtenAt?: string | null;
  size?: 'sm' | 'md';
  /** Set false inside links/cards, where the whole card is already the focus target. */
  focusable?: boolean;
  className?: string;
};

// Icon-only NFC state: filled pill when linked, dashed outline when not. Never colour alone.
export function NfcIndicator({ writtenAt, size = 'sm', focusable = true, className }: Props) {
  const linked = Boolean(writtenAt);
  const label = linked ? `NFC vinculada · ${formatDate(writtenAt as string)}` : 'Sin etiqueta NFC';
  return (
    <span
      role="img"
      aria-label={label}
      tabIndex={focusable ? 0 : undefined}
      className={cn(
        'group relative inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-6' : 'size-9',
        linked ? 'bg-accent text-primary' : 'border border-dashed border-input text-muted-foreground',
        className,
      )}
    >
      <Nfc className={size === 'sm' ? 'size-3.5' : 'size-5'} aria-hidden />
      <span
        aria-hidden
        className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground group-hover:block group-focus-visible:block"
      >
        {label}
      </span>
    </span>
  );
}
