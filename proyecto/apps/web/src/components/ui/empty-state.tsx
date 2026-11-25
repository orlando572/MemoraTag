import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

type Props = { icon: LucideIcon; title: string; description: string; badge?: string; children?: ReactNode };

export function EmptyState({ icon: Icon, title, description, badge, children }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center md:py-24">
      <span className="flex size-14 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-7" aria-hidden />
      </span>
      {badge ? <Badge className="mt-6">{badge}</Badge> : null}
      <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
