import type { EventType } from '@memoratag/contracts';
import type { Palette } from '../ui/tokens';
import { eventTypes } from '../ui/event-types';
import type { IconName } from '../ui/components';

/** Types a field user can register; photo/document events come from the web and are only displayed. */
export const registrableTypes = ['note', 'issue', 'maintenance', 'resolved'] as const;

/** Same icons and labels as the local history, plus «resolved» (success colour) and web-only types. */
export function companyEventLook(type: EventType, c: Palette): { icon: IconName; color: string; soft: string; label: string; hint: string } {
  if (type === 'resolved') return { icon: 'checkmark-circle-outline', color: c.success, soft: c.successSoft, label: 'Resuelto', hint: 'Una incidencia que ya quedó solucionada.' };
  if (type === 'photo') return { icon: 'image-outline', color: c.muted, soft: c.surfaceAlt, label: 'Foto', hint: '' };
  if (type === 'document') return { icon: 'document-attach-outline', color: c.muted, soft: c.surfaceAlt, label: 'Documento', hint: '' };
  const info = eventTypes[type];
  return { icon: info.icon, color: info.color(c), soft: info.soft(c), label: info.label, hint: info.hint };
}
