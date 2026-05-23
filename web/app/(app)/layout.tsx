import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell><div className="page-enter">{children}</div></AppShell>;
}
