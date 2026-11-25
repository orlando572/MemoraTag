import type { Metadata } from 'next';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SignOutButton } from '@/features/auth/sign-out-button';
import { CompanyCard } from '@/features/organization/company-card';
import { roleInfo } from '@/features/organization/roles';
import { getAppContext } from '@/features/organization/session';
import { ThemeToggle } from '@/features/theme/theme-toggle';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function AjustesPage() {
  const ctx = await getAppContext();
  const account = ctx.ok ? ctx : null;
  const role = account ? roleInfo[account.role].label : null;
  return (
    <>
      <PageHeader title="Ajustes" description="Tu cuenta y cómo prefieres ver MemoraTag." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Elige un tema o deja que siga el de tu dispositivo.</CardDescription>
          <div className="mt-6">
            <ThemeToggle />
          </div>
        </Card>

        {account?.organization ? <CompanyCard orgId={account.organization.id} name={account.organization.name} isAdmin={account.role === 'admin'} /> : null}

        <Card>
          <CardTitle>Tu cuenta</CardTitle>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Correo</dt>
              <dd className="mt-1 break-all font-semibold">{account?.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Rol</dt>
              <dd className="mt-1 font-semibold">{role ?? '—'}</dd>
            </div>
          </dl>
          <div className="mt-8 border-t border-border pt-6">
            <SignOutButton />
          </div>
        </Card>
      </div>
    </>
  );
}
