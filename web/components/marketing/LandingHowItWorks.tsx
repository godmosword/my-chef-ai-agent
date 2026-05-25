import { CookingModeMock } from "@/components/marketing/CookingModeMock";
import { MARKETING_SECTION } from "@/lib/marketing/content";

const { howItWorks } = MARKETING_SECTION;

const LIBRARY_ROWS = [
  { title: "三杯雞", cuisine: "台式" },
  { title: "番茄炒蛋", cuisine: "家常" },
  { title: "蒜香義大利麵", cuisine: "西式" },
] as const;

function InputStepMock() {
  return (
    <div
      className="flex min-h-[140px] flex-col justify-center rounded-lg border border-border-default bg-canvas p-3"
      aria-hidden
    >
      <div className="rounded-lg border border-border-default bg-surface-default px-3 py-2 text-sm text-text-muted">
        今晚想吃什麼？
      </div>
      <div className="mt-2 flex justify-end">
        <span className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-brand-greenText">
          生成食譜 →
        </span>
      </div>
    </div>
  );
}

function LibraryStepMock() {
  return (
    <ul
      className="flex min-h-[140px] flex-col justify-center gap-2 rounded-lg border border-border-default bg-canvas p-3"
      aria-hidden
    >
      {LIBRARY_ROWS.map((row) => (
        <li
          key={row.title}
          className="flex items-baseline justify-between gap-2 border-b border-border-default/60 pb-2 last:border-0 last:pb-0"
        >
          <span className="font-serif text-sm text-text-ink">{row.title}</span>
          <span className="text-[10px] text-text-muted">{row.cuisine}</span>
        </li>
      ))}
    </ul>
  );
}

function CookingStepMock() {
  return (
    <div
      className="min-h-[140px] overflow-hidden rounded-lg border border-border-default bg-surface-default"
      aria-hidden
    >
      <CookingModeMock />
    </div>
  );
}

const MOCKS = [InputStepMock, LibraryStepMock, CookingStepMock] as const;

export function LandingHowItWorks() {
  return (
    <section aria-labelledby="landing-how-heading">
      <h2
        id="landing-how-heading"
        className="text-center font-serif text-2xl font-medium text-text-ink sm:text-3xl"
      >
        {howItWorks.heading}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-text-muted sm:text-base">
        {howItWorks.subheading}
      </p>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {howItWorks.steps.map((step, index) => {
          const Mock = MOCKS[index]!;
          return (
            <li
              key={step.title}
              className="flex flex-col rounded-xl border border-border-default bg-surface-default p-4 shadow-card"
            >
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-3">
                <Mock />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium text-text-ink">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-body">{step.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
