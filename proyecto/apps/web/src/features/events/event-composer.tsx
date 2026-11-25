'use client';

import { useState } from 'react';
import { ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventForm } from './event-form';

// The form stays mounted while folded, so a half-written draft is never lost by toggling.
export function EventComposer({ objectId }: { objectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Button type="button" variant={open ? 'secondary' : 'default'} aria-expanded={open} aria-controls="event-form" onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronUp aria-hidden /> : <Plus aria-hidden />}
        {open ? 'Ocultar formulario' : 'Registrar evento'}
      </Button>
      <div id="event-form" hidden={!open}>
        <EventForm objectId={objectId} disabled={false} onSaved={() => setOpen(false)} />
      </div>
    </div>
  );
}
