'use client';

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTheme, useTheme, type ThemeChoice } from './theme';

const options: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

export function ThemeToggle() {
  const current = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="inline-flex flex-wrap gap-1 rounded-full border border-input bg-surface p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
              active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
