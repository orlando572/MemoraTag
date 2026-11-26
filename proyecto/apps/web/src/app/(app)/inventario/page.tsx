import type { Metadata } from 'next';
import { InventoryStatusSchema } from '@memoratag/contracts';
import { redirect } from 'next/navigation';
import { InventoryView } from '@/features/inventory/inventory-view';
import { getAppContext } from '@/features/organization/session';
import { serverApi } from '@/lib/api-server';

export const metadata: Metadata = { title: 'Inventario' };

type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

export default async function InventarioPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await getAppContext();
  if (!ctx.ok || !ctx.organization) redirect('/resumen');
  const orgId = ctx.organization.id;
  const sp = await searchParams;
  const status = InventoryStatusSchema.safeParse(first(sp.status));
  const nfc = first(sp.nfc) === 'with' || first(sp.nfc) === 'without' ? (first(sp.nfc) as 'with' | 'without') : undefined;
  const filters = { nfc, q: first(sp.q), status: status.success ? status.data : undefined, location: first(sp.location), category: first(sp.category) };
  const archived = first(sp.archived) === '1';
  const hasFilters = Object.values(filters).some(Boolean);

  const api = await serverApi();
  // The unfiltered list feeds the filter options and tells "empty inventory" from "no results".
  const allObjects = await api.objects.list(orgId, archived ? { archived: true } : undefined);
  const objects = hasFilters ? await api.objects.list(orgId, { ...filters, ...(archived ? { archived: true } : {}) }) : allObjects;

  return <InventoryView orgId={orgId} isAdmin={ctx.role === 'admin'} objects={objects} allObjects={allObjects} openNew={first(sp.nuevo) === '1'} archived={archived} />;
}
