// Inventory status labels and icons for company objects (same wording as the web app).
import type { InventoryStatus } from '@memoratag/contracts';
import type { Ionicons } from '@expo/vector-icons';

export const inventoryStatuses: Record<InventoryStatus, { label: string; icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'warning' | 'neutral' }> = {
  in_use: { label: 'En uso', icon: 'checkmark-circle', tone: 'success' },
  in_repair: { label: 'En reparación', icon: 'build', tone: 'warning' },
  retired: { label: 'De baja', icon: 'archive', tone: 'neutral' },
};
