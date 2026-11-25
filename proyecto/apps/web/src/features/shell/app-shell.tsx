'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import type { Role } from '@memoratag/contracts';
import { Brand } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { roleInfo } from '@/features/organization/roles';
import { cn } from '@/lib/utils';
import { itemsFor } from './nav';

type ShellProps = { organizationName: string; role: Role; email: string; children: React.ReactNode };

function SidebarContent({ organizationName, role, email, onNavigate }: Omit<ShellProps, 'children'> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { label, icon: RoleIcon } = roleInfo[role];
  return (
    <div className="flex h-full flex-col">
      <Link href="/resumen" onClick={onNavigate} className="rounded-md px-2 py-1">
        <Brand />
      </Link>

      <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent font-heading text-lg font-semibold text-accent-foreground" aria-hidden>
          {organizationName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={organizationName}>
            {organizationName}
          </p>
          <Badge className="mt-1 px-2 py-0.5">
            <RoleIcon aria-hidden />
            {label}
          </Badge>
        </div>
      </div>

      <nav aria-label="Principal" className="mt-8 flex-1">
        <ul className="space-y-1">
          {itemsFor(role).map(({ href, label: text, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors',
                    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {text}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border pt-4">
        <p className="truncate px-2 pb-3 text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <SignOutButton variant="ghost" className="w-full justify-start" />
      </div>
    </div>
  );
}

export function AppShell(props: ShellProps) {
  const [open, setOpen] = useState(false);
  const { children, ...sidebar } = props;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-border p-5 lg:block">
        <SidebarContent {...sidebar} />
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-2 lg:hidden">
          <Brand />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Abrir menú"
              className="inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <SheetDescription className="sr-only">Navegación principal</SheetDescription>
              <SidebarContent {...sidebar} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <main className="mx-auto w-full max-w-[1200px] px-6 py-10 md:px-12 md:py-16">{children}</main>
      </div>
    </div>
  );
}
