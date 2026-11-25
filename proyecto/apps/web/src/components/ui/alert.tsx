import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// Error message with icon + text (never colour alone).
export function ErrorAlert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('flex items-start gap-2.5 rounded-md bg-danger-soft px-4 py-3 text-sm font-medium text-destructive', className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
