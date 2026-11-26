'use client';

import type { InventoryStatus } from '@memoratag/contracts';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Boxes, Download, FilterX, Plus, Search, SearchX } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { errorMessage, type WebObject } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { NfcIndicator } from './nfc-indicator';
import { ObjectAvatar } from './object-avatar';
import { ObjectFormDialog } from './object-form-dialog';
import { inventoryStatuses } from './status';
import { StatusChip } from './status-chip';

type SortKey = 'name' | 'internal_code' | 'category' | 'location' | 'assignee' | 'status';
type Props = { orgId: string; isAdmin: boolean; objects: WebObject[]; allObjects: WebObject[]; openNew: boolean; archived: boolean };

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'internal_code', label: 'Código' },
  { key: 'category', label: 'Categoría' },
  { key: 'location', label: 'Ubicación' },
  { key: 'assignee', label: 'Responsable' },
  { key: 'status', label: 'Estado' },
];

const unique = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'es'));

export function InventoryView({ orgId, isAdmin, objects, allObjects, openNew, archived }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const location = params.get('location') ?? '';
  const category = params.get('category') ?? '';
  const nfc = params.get('nfc') ?? '';
  const filtering = Boolean(urlQuery || status || location || category || nfc);

  const [search, setSearch] = useState(urlQuery);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [creating, setCreating] = useState(openNew);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.delete('nuevo');
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    const text = next.toString();
    router.replace(text ? `${pathname}?${text}` : pathname);
  }

  // Debounced search: write to the URL 350 ms after the last keystroke.
  useEffect(() => {
    if (search.trim() === urlQuery) return;
    const timer = setTimeout(() => update({ q: search.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const rows = useMemo(() => {
    const sorted = [...objects].sort((a, b) => {
      const left = sort.key === 'status' ? inventoryStatuses[a.status].label : (a[sort.key] ?? '');
      const right = sort.key === 'status' ? inventoryStatuses[b.status].label : (b[sort.key] ?? '');
      // Empty values always go last.
      if (!left && right) return 1;
      if (left && !right) return -1;
      return left.localeCompare(right, 'es', { sensitivity: 'base', numeric: true });
    });
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [objects, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await browserApi().objects.exportCsv(orgId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventario.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (failure) {
      setExportError(errorMessage(failure));
    } finally {
      setExporting(false);
    }
  }

  const newButton = isAdmin && !archived ? (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden />
      Nuevo objeto
    </Button>
  ) : null;

  const dialog = isAdmin && !archived ? (
    <ObjectFormDialog
      open={creating}
      onOpenChange={(open) => {
        setCreating(open);
        if (!open && openNew) router.replace(pathname);
      }}
      orgId={orgId}
    />
  ) : null;

  const switchTo = (value: boolean) => {
    setSearch('');
    update({ archived: value ? '1' : '', q: '', status: '', location: '', category: '', nfc: '' });
  };

  if (allObjects.length === 0 && archived) {
    return (
      <>
        <PageHeader title="Inventario" description="Objetos archivados de tu empresa." />
        <EmptyState icon={Archive} title="No hay objetos archivados" description="Cuando un administrador archive un objeto, lo encontrarás aquí.">
          <Button variant="secondary" onClick={() => switchTo(false)}>
            Ver objetos activos
          </Button>
        </EmptyState>
      </>
    );
  }

  if (allObjects.length === 0) {
    return (
      <>
        <PageHeader title="Inventario" description="Todo lo que tu empresa cuida, con su historia." />
        <EmptyState
          icon={Boxes}
          title="Todavía no hay objetos"
          description={isAdmin ? 'Crea el primero y tu equipo podrá consultarlo, cambiar su estado y registrar eventos.' : 'Cuando un administrador añada objetos, los verás aquí.'}
        >
          {newButton}
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => switchTo(true)}>
              Ver archivados
            </Button>
          </div>
        </EmptyState>
        {dialog}
      </>
    );
  }

  const locations = unique(allObjects.map((o) => o.location));
  const categories = unique(allObjects.map((o) => o.category));

  return (
    <>
      <PageHeader
        title="Inventario"
        description={archived ? 'Objetos archivados de tu empresa.' : 'Todo lo que tu empresa cuida, con su historia.'}
        actions={
          archived ? undefined : (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={exportCsv} disabled={exporting}>
                <Download aria-hidden />
                {exporting ? 'Exportando…' : 'Exportar CSV'}
              </Button>
              {newButton}
            </div>
          )
        }
      />
      <div role="radiogroup" aria-label="Ver objetos" className="mb-6 inline-flex gap-1 rounded-full border border-input bg-surface p-1">
        {[
          { value: false, label: 'Activos' },
          { value: true, label: 'Archivados' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={archived === option.value}
            onClick={() => archived !== option.value && switchTo(option.value)}
            className={cn(
              'inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition-colors',
              archived === option.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {archived ? (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted px-5 py-4 text-sm font-semibold">
          <Archive className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span>Estás viendo objetos archivados. No se pueden editar; un administrador puede restaurarlos desde su ficha.</span>
        </div>
      ) : null}
      {exportError ? <ErrorAlert className="mb-6">{exportError}</ErrorAlert> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,180px))]">
        <div className="relative col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Buscar objetos" placeholder="Buscar por nombre, código…" className="pl-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filtrar por estado" value={status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Estado</option>
          {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => (
            <option key={key} value={key}>
              {inventoryStatuses[key].label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por ubicación" value={location} onChange={(e) => update({ location: e.target.value })}>
          <option value="">Ubicación</option>
          {locations.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select aria-label="Filtrar por NFC" value={nfc} onChange={(e) => update({ nfc: e.target.value })}>
          <option value="">NFC</option>
          <option value="with">Con etiqueta</option>
          <option value="without">Sin etiqueta</option>
        </Select>
        <Select aria-label="Filtrar por categoría" value={category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Categoría</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
          {filtering ? `${objects.length} de ${allObjects.length}` : objects.length} {(filtering ? allObjects.length : objects.length) === 1 ? 'objeto' : 'objetos'}
        </p>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              update({ q: '', status: '', location: '', category: '', nfc: '' });
            }}
          >
            <FilterX aria-hidden />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="Sin resultados" description="Ningún objeto coincide con la búsqueda o los filtros.">
          {filtering ? (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                router.replace(pathname);
              }}
            >
              Quitar filtros
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {columns.map(({ key, label }) => {
                    const active = sort.key === key;
                    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                    return (
                      <th key={key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={cn('-mx-2 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-semibold hover:bg-muted', active ? 'text-foreground' : 'text-muted-foreground')}
                        >
                          {label}
                          <Icon className="size-3.5" aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/inventario/${o.id}`} className="flex items-center gap-3 rounded-sm font-semibold hover:text-primary">
                          <ObjectAvatar color={o.color} />
                          <span>{o.name}</span>
                        </Link>
                        <NfcIndicator writtenAt={o.nfc_written_at} />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.internal_code || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.category || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.location || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{o.assignee || '—'}</td>
                    <td className="px-5 py-3">
                      <StatusChip status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-3 md:hidden">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/inventario/${o.id}`} className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/50">
                  <div className="flex items-start gap-3">
                    <ObjectAvatar color={o.color} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="min-w-0">{o.name}</span>
                        <NfcIndicator writtenAt={o.nfc_written_at} focusable={false} />
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{[o.internal_code, o.category, o.location].filter(Boolean).join(' · ') || 'Sin más datos'}</p>
                      {o.assignee ? <p className="text-sm text-muted-foreground">Responsable: {o.assignee}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3">
                    <StatusChip status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {dialog}
    </>
  );
}
