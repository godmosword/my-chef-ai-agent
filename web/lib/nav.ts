import {
  BookOpen,
  Calendar,
  Flame,
  Settings,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";
import { FLAGS } from "@/lib/flags";

export type NavSection = "下廚" | "規劃" | "帳號";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  section: NavSection;
  soonMessage?: string;
};

export const APP_NAV: NavItem[] = [
  { href: "/app", label: "今晚", icon: Flame, enabled: true, section: "下廚" },
  {
    href: "/app/library",
    label: "料理書",
    icon: BookOpen,
    enabled: true,
    section: "下廚",
  },
  {
    href: "/app/plan",
    label: "週曆",
    icon: Calendar,
    enabled: FLAGS.mealPlan,
    section: "規劃",
    soonMessage: "週曆規劃即將推出",
  },
  {
    href: "/app/shopping",
    label: "採買",
    icon: ShoppingCart,
    enabled: FLAGS.mealPlan,
    section: "規劃",
    soonMessage: "購物清單即將推出",
  },
  {
    href: "/app/me",
    label: "我的",
    icon: User,
    enabled: true,
    section: "帳號",
  },
  {
    href: "/app/settings",
    label: "設定",
    icon: Settings,
    enabled: true,
    section: "帳號",
  },
];
