import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { MembersView } from '@/features/members/members-view';
import { getAppContext } from '@/features/organization/session';
import { serverApi } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Miembros' };

export default async function MiembrosPage() {
  const ctx = await getAppContext();
  // Members are managed by admins only.
  if (!ctx.ok || !ctx.organization || ctx.role !== 'admin') redirect('/resumen');
  const members = await (await serverApi()).organizations.members(ctx.organization.id);
  return (
    <>
      <PageHeader title="Miembros" description="Quién forma parte de tu empresa y qué puede hacer." />
      <MembersView orgId={ctx.organization.id} currentUserId={ctx.userId} members={members} />
    </>
  );
}
