import { TriangleAlert } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { CreateOrganization } from '@/features/organization/create-organization';
import { getAppContext } from '@/features/organization/session';
import { AppShell } from '@/features/shell/app-shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();

  if (!ctx.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <Brand />
        <span className="mt-12 flex size-14 items-center justify-center rounded-lg bg-warning-soft text-warning">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight">No pudimos cargar tu empresa</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{ctx.message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <a href="/resumen">Reintentar</a>
          </Button>
          <SignOutButton />
        </div>
      </main>
    );
  }

  if (!ctx.organization) return <CreateOrganization />;

  return (
    <AppShell organizationName={ctx.organization.name} role={ctx.role} email={ctx.email}>
      {children}
    </AppShell>
  );
}
