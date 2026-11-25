import { ShieldCheck, User, type LucideIcon } from 'lucide-react';
import type { Role } from '@memoratag/contracts';

export const roleInfo: Record<Role, { label: string; icon: LucideIcon }> = {
  admin: { label: 'Administrador', icon: ShieldCheck },
  member: { label: 'Miembro', icon: User },
};
