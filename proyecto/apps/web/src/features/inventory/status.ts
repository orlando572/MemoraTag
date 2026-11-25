import { Archive, CircleCheck, Wrench, type LucideIcon } from 'lucide-react';
import type { InventoryStatus } from '@memoratag/contracts';

export const inventoryStatuses: Record<InventoryStatus, { label: string; icon: LucideIcon; tone: 'success' | 'warning' | 'neutral' }> = {
  in_use: { label: 'En uso', icon: CircleCheck, tone: 'success' },
  in_repair: { label: 'En reparación', icon: Wrench, tone: 'warning' },
  retired: { label: 'De baja', icon: Archive, tone: 'neutral' },
};
