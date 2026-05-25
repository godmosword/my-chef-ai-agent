/** Static cooking-mode UI preview for marketing (no images). */
export function CookingModeMock() {
  return (
    <div
      className="flex h-full flex-col justify-center space-y-3 p-4"
      aria-hidden
    >
      <p className="text-xs uppercase tracking-wide text-text-muted">步驟 2 / 5</p>
      <p className="font-serif text-xl leading-snug text-text-ink sm:text-2xl">
        中火下鍋，煎至兩面金黃
      </p>
      <div className="inline-flex w-fit rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-brand-greenText">
        計時 08:00
      </div>
    </div>
  );
}
