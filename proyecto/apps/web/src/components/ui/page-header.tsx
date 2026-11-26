import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-14">
      <div className="min-w-0">
        <h1 className="font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-6xl">{title}</h1>
        {description ? <p className="mt-3 max-w-xl text-lg text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
