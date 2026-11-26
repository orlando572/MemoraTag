import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, Activity, Boxes, Plus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { EventIcon } from '@/features/events/event-timeline';
import { eventTypes } from '@/features/events/event-types';
import { toneClasses, type Tone } from '@/features/events/tone';
import { inventoryStatuses } from '@/features/inventory/status';
import { getAppContext } from '@/features/organization/session';
import { serverApi } from '@/lib/api-server';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Resumen' };

function Indicator({ icon: Icon, label, value, tone = 'neutral', href, wide }: { icon: LucideIcon; label: string; value: number; tone?: Tone; href: string; wide?: boolean }) {
  return (
    <Link href={href} className={cn('block min-w-0 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/60 sm:p-6', wide && 'col-span-2 lg:col-span-1')}>
      <span className={cn('flex size-10 items-center justify-center rounded-md', toneClasses[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-heading text-4xl font-semibold tracking-[-0.03em] sm:mt-5 sm:text-5xl">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
    </Link>
  );
}

export default async function ResumenPage() {
  const ctx = await getAppContext();
  if (!ctx.ok || !ctx.organization) return null;
  const orgId = ctx.organization.id;
  const api = await serverApi();
  const [summary, objects] = await Promise.all([api.organizations.summary(orgId), api.objects.list(orgId)]);
  const names = new Map(objects.map((o) => [o.id, o.name]));
  const isAdmin = ctx.role === 'admin';
  const description = `Lo más importante de ${ctx.organization.name}, de un vistazo.`;

  if (summary.total === 0) {
    return (
      <>
        <PageHeader title="Resumen" description={description} />
        <EmptyState
          icon={Boxes}
          title="Tu inventario está vacío"
          description={isAdmin ? 'Crea tu primer objeto y aquí verás los totales, las incidencias abiertas y la actividad de tu equipo.' : 'Cuando un administrador añada objetos, aquí verás los totales y la actividad reciente.'}
        >
          {isAdmin ? (
            <Button asChild size="lg">
              <Link href="/inventario?nuevo=1">
                <Plus aria-hidden />
                Crear tu primer objeto
              </Link>
            </Button>
          ) : null}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Resumen" description={description} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Indicator icon={Boxes} label="Objetos en total" value={summary.total} href="/inventario" wide />
        <Indicator icon={inventoryStatuses.in_use.icon} label={inventoryStatuses.in_use.label} value={summary.by_status.in_use ?? 0} tone="success" href="/inventario?status=in_use" />
        <Indicator icon={inventoryStatuses.in_repair.icon} label={inventoryStatuses.in_repair.label} value={summary.by_status.in_repair ?? 0} tone="warning" href="/inventario?status=in_repair" />
        <Indicator icon={inventoryStatuses.retired.icon} label={inventoryStatuses.retired.label} value={summary.by_status.retired ?? 0} href="/inventario?status=retired" />
        <Indicator icon={AlertCircle} label="Incidencias abiertas" value={summary.open_incidents} tone={summary.open_incidents > 0 ? 'danger' : 'neutral'} href="#actividad" />
      </div>

      <Card id="actividad" className="mt-10 scroll-mt-8">
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>Lo último que ha registrado tu equipo.</CardDescription>
        {summary.recent_events.length === 0 ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-border px-5 py-8 text-muted-foreground">
            <Activity className="size-5 shrink-0" aria-hidden />
            Aún no hay eventos registrados.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {summary.recent_events.map((event) => (
              <li key={event.id} className="flex gap-4 py-4">
                <EventIcon type={event.type} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {eventTypes[event.type].label} ·{' '}
                    <Link href={`/inventario/${event.object_id}`} className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline">
                      {names.get(event.object_id) ?? 'Objeto archivado'}
                    </Link>{' '}
                    · <span className="whitespace-nowrap">{formatDate(event.event_date ?? event.created_at)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
