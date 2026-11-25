import { Boxes, LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@memoratag/contracts';

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const navItems: NavItem[] = [
  { href: '/resumen', label: 'Resumen', icon: LayoutDashboard },
  { href: '/inventario', label: 'Inventario', icon: Boxes },
  { href: '/miembros', label: 'Miembros', icon: Users, adminOnly: true },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export const itemsFor = (role: Role) => navItems.filter((item) => !item.adminOnly || role === 'admin');
