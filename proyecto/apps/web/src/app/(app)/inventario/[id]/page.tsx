import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { EventForm } from '@/features/events/event-form';
import { EventTimeline } from '@/features/events/event-timeline';
import { ArchiveObjectButton, EditObjectButton, StatusControl } from '@/features/inventory/object-actions';
import { ObjectAvatar } from '@/features/inventory/object-avatar';
import { ObjectQr } from '@/features/inventory/object-qr';
import { getAppContext } from '@/features/organization/session';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api-server';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Objeto' };

export default async function ObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (!ctx.ok || !ctx.organization) redirect('/resumen');
  const api = await serverApi();
  let object, events;
  try {
    [object, events] = await Promise.all([api.objects.get(id), api.objects.events(id)]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
  const isAdmin = ctx.role === 'admin';
  const archived = Boolean(object.archived_at);
  const sorted = [...events].sort((a, b) => (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at));

  const data: [string, string | null | undefined][] = [
    ['Código interno', object.internal_code],
    ['Categoría', object.category],
    ['Ubicación', object.location],
    ['Responsable', object.assignee],
    ['Alta', formatDate(object.created_at)],
  ];

  return (
    <>
      <Link href="/inventario" className="mb-6 inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Inventario
      </Link>
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 md:mb-14">
        <div className="flex min-w-0 items-center gap-5">
          <ObjectAvatar color={object.color} className="size-16 rounded-lg" />
          <div className="min-w-0">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">{object.name}</h1>
            {archived ? (
              <Badge className="mt-3">
                <Archive aria-hidden />
                Archivado
              </Badge>
            ) : null}
          </div>
        </div>
        {isAdmin && !archived ? <EditObjectButton orgId={ctx.organization.id} object={object} /> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Datos del objeto</CardTitle>
            {object.description ? <p className="mt-3 whitespace-pre-line text-muted-foreground">{object.description}</p> : null}
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {data.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-semibold">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardTitle>Historia</CardTitle>
            <div className="mt-6 space-y-8">
              {archived ? null : <EventForm objectId={object.id} disabled={false} />}
              <EventTimeline events={sorted} isAdmin={isAdmin} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 md:p-6">
            <CardTitle className="mb-4">Estado</CardTitle>
            <StatusControl id={object.id} status={object.status} disabled={archived} />
          </Card>
          <Card className="p-6 md:p-6">
            <CardTitle className="mb-4">Código QR</CardTitle>
            <ObjectQr id={object.id} name={object.name} code={object.internal_code} />
          </Card>
          {isAdmin && !archived ? <ArchiveObjectButton id={object.id} name={object.name} /> : null}
        </div>
      </div>
    </>
  );
}
