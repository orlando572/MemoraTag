import type { Ionicons } from '@expo/vector-icons';
import type { EventType, MemoryEvent } from '../storage';
import type { Palette } from './tokens';

type Info = { label: string; plural: string; icon: keyof typeof Ionicons.glyphMap; color: (c: Palette) => string; soft: (c: Palette) => string; hint: string };

// Each type has its own icon, colour and name, so it is never identified by colour alone.
export const eventTypes: Record<EventType, Info> = {
  note: { label: 'Nota', plural: 'Notas', icon: 'document-text-outline', color: (c) => c.primary, soft: (c) => c.primarySoft, hint: 'Un recuerdo o dato que quieras guardar.' },
  issue: { label: 'Incidencia', plural: 'Incidencias', icon: 'alert-circle-outline', color: (c) => c.danger, soft: (c) => c.dangerSoft, hint: 'Algo que falla o hay que revisar. Podrás marcarla como resuelta.' },
  maintenance: { label: 'Mantenimiento', plural: 'Mantenimientos', icon: 'build-outline', color: (c) => c.warning, soft: (c) => c.warningSoft, hint: 'Una revisión, limpieza o reparación realizada.' },
};

export function eventTypeInfo(type: EventType | string) {
  return eventTypes[type as EventType] ?? eventTypes.note;
}

/** Visual state of an event: resolved issues switch to the success colour and a check icon. */
export function eventAppearance(event: Pick<MemoryEvent, 'type' | 'resolved_at'>, c: Palette) {
  const info = eventTypeInfo(event.type);
  if (event.type === 'issue' && event.resolved_at) return { icon: 'checkmark-circle-outline' as const, color: c.success, soft: c.successSoft, label: 'Incidencia resuelta' };
  return { icon: info.icon, color: info.color(c), soft: info.soft(c), label: info.label };
}
