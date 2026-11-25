'use client';

import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Runs the action; throw to show the error inside the dialog. */
  onConfirm: () => Promise<void>;
  errorOverrides?: Partial<Record<number, string>>;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, errorOverrides }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (failure) {
      setError(errorMessage(failure, errorOverrides));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {error ? <ErrorAlert className="mt-5">{error}</ErrorAlert> : null}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={run} disabled={busy}>
            {busy ? 'Un momento…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
