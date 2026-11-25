import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-md border border-input bg-surface px-4 py-3 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:border-foreground/60 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
