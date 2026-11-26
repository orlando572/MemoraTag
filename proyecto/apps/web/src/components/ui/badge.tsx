import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold [&_svg]:size-3.5', {
  variants: {
    tone: {
      neutral: 'bg-muted text-muted-foreground',
      primary: 'bg-accent text-accent-foreground',
      danger: 'bg-danger-soft text-destructive',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

// Always pair a state badge with an icon and text, never colour alone.
function Badge({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge };
