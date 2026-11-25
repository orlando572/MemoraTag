import { AlertCircle, CheckCircle2, FileText, FileUp, Image as ImageIcon, Wrench, type LucideIcon } from 'lucide-react';
import type { EventType } from '@memoratag/contracts';

type Tone = 'neutral' | 'danger' | 'warning' | 'success';

// Mirrors apps/mobile/src/ui/event-types.ts: each type has its own icon, tone and name.
export const eventTypes: Record<EventType, { label: string; icon: LucideIcon; tone: Tone }> = {
  note: { label: 'Nota', icon: FileText, tone: 'neutral' },
  issue: { label: 'Incidencia', icon: AlertCircle, tone: 'danger' },
  maintenance: { label: 'Mantenimiento', icon: Wrench, tone: 'warning' },
  resolved: { label: 'Incidencia resuelta', icon: CheckCircle2, tone: 'success' },
  photo: { label: 'Foto', icon: ImageIcon, tone: 'neutral' },
  document: { label: 'Documento', icon: FileUp, tone: 'neutral' },
};
