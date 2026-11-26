import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { ArrowLeft, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { EventComposer } from '@/features/events/event-composer';
import { EventTimeline } from '@/features/events/event-timeline';
import { ArchiveObjectButton, EditObjectButton, RestoreObjectButton, StatusControl } from '@/features/inventory/object-actions';
import { NfcIndicator } from '@/features/inventory/nfc-indicator';
import { ObjectAvatar } from '@/features/inventory/object-avatar';
import { ObjectQr } from '@/features/inventory/object-qr';
import { getAppContext } from '@/features/organization/session';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api-server';
import { formatDate } from '@/lib/format';

// Shared by generateMetadata and the page (one API call per request).
const getObject = cache(async (id: string) => (await serverApi()).objects.get(id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    return { title: (await getObject((await params).id)).name };
  } catch {
    return { title: 'Objeto' };
  }
}

export default async function ObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppContext();
  if (!ctx.ok || !ctx.organization) redirect('/resumen');
  const api = await serverApi();
  let object, events;
  try {
    [object, events] = await Promise.all([getObject(id), api.objects.events(id)]);
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
      {archived ? (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted px-5 py-4">
          <p className="flex items-start gap-3 text-sm font-semibold">
            <Archive className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span>Este objeto está archivado: no se puede editar ni registrar eventos.</span>
          </p>
          {isAdmin ? <RestoreObjectButton id={object.id} name={object.name} /> : null}
        </div>
      ) : null}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-6 md:mb-14">
        <div className="flex min-w-0 items-center gap-5">
          <ObjectAvatar color={object.color} className="size-16 rounded-lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 break-words font-heading text-4xl font-semibold tracking-[-0.03em] text-balance md:text-5xl">{object.name}</h1>
              <NfcIndicator writtenAt={object.nfc_written_at} size="md" />
            </div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardTitle>Datos del objeto</CardTitle>
            {object.description ? <p className="mt-3 whitespace-pre-line text-muted-foreground">{object.description}</p> : null}
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {data.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-semibold">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Mobile only: the status card comes right after the data; on desktop it lives in the side column */}
          <Card className="p-6 md:p-6 lg:hidden">
            <CardTitle className="mb-4">Estado</CardTitle>
            <StatusControl id={object.id} status={object.status} disabled={archived} />
          </Card>

          <Card>
            <CardTitle>Historia</CardTitle>
            <div className="mt-6 space-y-8">
              {archived ? null : <EventComposer objectId={object.id} />}
              <EventTimeline events={sorted} isAdmin={isAdmin} currentUserId={ctx.userId} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="hidden p-6 md:p-6 lg:block">
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
