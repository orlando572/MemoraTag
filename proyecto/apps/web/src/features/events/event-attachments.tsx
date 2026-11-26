'use client';

import type { EventFile } from '@memoratag/contracts';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileSpreadsheet, FileText, ImageOff, Trash2 } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/features/toast/toast';
import { errorMessage } from '@/lib/api';
import { browserApi } from '@/lib/api-client';
import { formatBytes } from './files';

function RemoveFile({ file, className }: { file: EventFile; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className={className} aria-label={`Quitar archivo ${file.name}`} title="Quitar archivo" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Quitar este archivo?"
        description={`«${file.name}» se eliminará del evento y no se podrá recuperar.`}
        confirmLabel="Quitar archivo"
        errorOverrides={{ 409: 'Este objeto está archivado y ya no se puede modificar.' }}
        onConfirm={async () => {
          await browserApi().files.remove(file.id);
          toast('Archivo quitado');
          router.refresh();
        }}
      />
    </>
  );
}

// Signed URLs expire after 5 minutes: `refresh` asks for a new one (also used when the image fails to load).
function useSignedUrl(fileId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      setUrl((await browserApi().files.url(fileId)).url);
    } catch {
      setUrl(null);
      setFailed(true);
    }
  }, [fileId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  return { url, failed, refresh };
}

function PhotoThumb({ file, isAdmin }: { file: EventFile; isAdmin: boolean }) {
  const { url, failed, refresh } = useSignedUrl(file.id);
  const [open, setOpen] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [broken, setBroken] = useState(false);

  // One automatic renewal if the image fails (expired URL); after that show a retry button.
  function onImageError() {
    if (renewed) return setBroken(true);
    setRenewed(true);
    void refresh();
  }

  return (
    <div className="relative size-24 sm:size-28">
      {url && !broken ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`Ver ${file.name} en grande`} className="size-full overflow-hidden rounded-md border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={file.name} className="size-full object-cover" onError={onImageError} onLoad={() => setRenewed(false)} />
        </button>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted p-2 text-center text-xs text-muted-foreground">
          {failed || broken ? (
            <>
              <ImageOff className="size-5" aria-hidden />
              <button
                type="button"
                className="rounded-sm font-semibold text-primary hover:underline"
                onClick={() => {
                  setBroken(false);
                  setRenewed(false);
                  void refresh();
                }}
              >
                Reintentar
              </button>
            </>
          ) : (
            'Cargando…'
          )}
        </div>
      )}
      {isAdmin ? <RemoveFile file={file} className="absolute -right-2 -top-2 size-8 border border-border bg-card" /> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="text-lg">{file.name}</DialogTitle>
          <DialogDescription>{formatBytes(file.size)}</DialogDescription>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="mt-4 max-h-[70vh] w-full rounded-md object-contain" onError={() => void refresh()} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentRow({ file, isAdmin }: { file: EventFile; isAdmin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = file.mime === 'application/pdf' ? FileText : FileSpreadsheet;

  async function open() {
    setBusy(true);
    setError(null);
    // Open the tab first (inside the click) so popup blockers allow it, then point it to the signed URL.
    const tab = window.open('about:blank', '_blank');
    try {
      const { url } = await browserApi().files.url(file.id);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.location.href = url;
    } catch (failure) {
      tab?.close();
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-surface p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {file.mime === 'application/pdf' ? 'PDF' : 'Excel'} · {formatBytes(file.size)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={open} disabled={busy} aria-label={`Abrir ${file.name}`}>
          <ExternalLink aria-hidden />
          {/* Narrow screens keep the icon only; the aria-label still names the file. */}
          <span className="hidden sm:inline">{busy ? 'Abriendo…' : 'Abrir'}</span>
        </Button>
        {isAdmin ? <RemoveFile file={file} /> : null}
      </div>
      {error ? <ErrorAlert className="mt-2">{error}</ErrorAlert> : null}
    </div>
  );
}

export function EventAttachments({ files, isAdmin }: { files: EventFile[]; isAdmin: boolean }) {
  if (files.length === 0) return null;
  const photos = files.filter((f) => f.kind === 'photo');
  const documents = files.filter((f) => f.kind === 'document');
  return (
    <div className="mt-3 space-y-3">
      {photos.length ? (
        <div className="flex flex-wrap gap-3">
          {photos.map((file) => (
            <PhotoThumb key={file.id} file={file} isAdmin={isAdmin} />
          ))}
        </div>
      ) : null}
      {documents.length ? (
        <div className="grid grid-cols-1 gap-2">
          {documents.map((file) => (
            <DocumentRow key={file.id} file={file} isAdmin={isAdmin} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
