import {
  BookOpen,
  Calendar,
  Flame,
  Settings,
  ShoppingCart,
  User,
  type LucideIcon,
} from "lucide-react";
import { FLAGS } from "@/platform/config/flags";

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
  { href: "/app", label: "今晚吃什麼", icon: Flame, enabled: true, section: "下廚" },
  {
    href: "/app/library",
    label: "我的食譜",
    icon: BookOpen,
    enabled: true,
    section: "下廚",
  },
  {
    href: "/app/plan",
    label: "週菜單",
    icon: Calendar,
    enabled: FLAGS.mealPlan,
    section: "規劃",
    soonMessage: "週菜單即將推出",
  },
  {
    href: "/app/shopping",
    label: "買菜清單",
    icon: ShoppingCart,
    enabled: FLAGS.mealPlan,
    section: "規劃",
    soonMessage: "買菜清單即將推出",
  },
  {
    href: "/app/me",
    label: "你",
    icon: User,
    enabled: true,
    section: "帳號",
  },
  {
    href: "/app/settings",
    label: "偏好",
    icon: Settings,
    enabled: true,
    section: "帳號",
  },
];
