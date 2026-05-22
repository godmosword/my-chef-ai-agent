import {
  BookOpen,
  Calendar,
  Home,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  soonMessage?: string;
};

export const APP_NAV: NavItem[] = [
  { href: "/app", label: "Today", icon: Home, enabled: true },
  { href: "/app/library", label: "Library", icon: BookOpen, enabled: true },
  {
    href: "/app/plan",
    label: "Plan",
    icon: Calendar,
    enabled: false,
    soonMessage: "週曆規劃即將推出",
  },
  {
    href: "/app/shopping",
    label: "Shopping",
    icon: ShoppingCart,
    enabled: false,
    soonMessage: "購物清單即將推出",
  },
  { href: "/app/me", label: "Me", icon: User, enabled: true },
];
