import { CommandBar } from "@/components/patterns/CommandBar";

export function AppDesktopHeader() {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between gap-4 border-b border-border-default bg-surface-default/95 px-4 py-3 backdrop-blur md:flex">
      <p className="font-serif text-lg text-text-ink">職人料理</p>
      <CommandBar />
    </header>
  );
}
