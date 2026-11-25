import type { InventoryStatus } from '@memoratag/contracts';
import { Badge } from '@/components/ui/badge';
import { inventoryStatuses } from './status';

export function StatusChip({ status }: { status: InventoryStatus }) {
  const { label, icon: Icon, tone } = inventoryStatuses[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}
