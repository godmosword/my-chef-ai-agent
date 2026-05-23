import { UseCaseCard } from "@/components/marketing/UseCaseCard";
import { MARKETING_SECTION } from "@/lib/marketing/content";

export function UseCaseGrid() {
  return (
    <section aria-labelledby="landing-usecases-heading" id="use-cases">
      <h2
        id="landing-usecases-heading"
        className="text-center font-serif text-2xl font-medium text-text-ink sm:text-3xl"
      >
        試試這些情境
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-text-muted sm:text-base">
        點選卡片，我們會把範例輸入帶到今晚頁，直接生成。
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETING_SECTION.useCases.map((item) => (
          <li key={item.id} className={item.id === "guests" ? "sm:col-span-2 lg:col-span-1" : undefined}>
            <UseCaseCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
