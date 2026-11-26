import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'min-h-11 w-full rounded-md border border-input bg-surface px-4 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:border-foreground/60 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
