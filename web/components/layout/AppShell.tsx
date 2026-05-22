import { AppSidebar } from "./AppSidebar";
import { AppTabBar } from "./AppTabBar";
import { CommandBar } from "@/components/patterns/CommandBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border-default bg-surface-default/95 px-4 py-3 backdrop-blur">
          <p className="font-serif text-lg text-text-ink md:hidden">職人料理</p>
          <CommandBar />
        </header>
        <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <AppTabBar />
    </div>
  );
}
