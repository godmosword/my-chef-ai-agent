import {
  BookOpen,
  Calendar,
  Home,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";
import { FLAGS } from "@/lib/flags";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  soonMessage?: string;
};

export const APP_NAV: NavItem[] = [
  { href: "/app", label: "今晚", icon: Home, enabled: true },
  { href: "/app/library", label: "料理書", icon: BookOpen, enabled: true },
  {
    href: "/app/plan",
    label: "週曆",
    icon: Calendar,
    enabled: FLAGS.mealPlan,
    soonMessage: "週曆規劃即將推出",
  },
  {
    href: "/app/shopping",
    label: "採買",
    icon: ShoppingCart,
    enabled: FLAGS.mealPlan,
    soonMessage: "購物清單即將推出",
  },
  { href: "/app/me", label: "我的", icon: User, enabled: true },
];
