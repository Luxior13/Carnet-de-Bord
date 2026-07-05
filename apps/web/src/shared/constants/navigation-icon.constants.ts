import {
  Activity,
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Handshake,
  History,
  Home,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

export const NAVIGATION_ICONS = {
  Activity,
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Handshake,
  History,
  Home,
  LayoutDashboard,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} satisfies Record<string, LucideIcon>;

export type NavigationIconName = keyof typeof NAVIGATION_ICONS;

const NAVIGATION_ICON_MAP = new Map<NavigationIconName, LucideIcon>(
  Object.entries(NAVIGATION_ICONS) as [NavigationIconName, LucideIcon][],
);

export function getNavigationIcon(icon: NavigationIconName): LucideIcon {
  return NAVIGATION_ICON_MAP.get(icon) ?? Settings;
}
