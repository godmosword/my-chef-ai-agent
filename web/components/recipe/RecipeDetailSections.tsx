import { formatIngredient, formatStep } from "@/lib/recipe-steps";

type RecipeDetailSectionsProps = {
  ingredients?: unknown[] | null;
  steps?: unknown[] | null;
};

export function RecipeDetailSections({ ingredients, steps }: RecipeDetailSectionsProps) {
  const ingList = ingredients ?? [];
  const stepList = steps ?? [];

  return (
    <>
      {ingList.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-ink">食材</h2>
          <ul className="mt-2 list-inside list-disc text-text-body">
            {ingList.map((ing, i) => (
              <li key={i}>{formatIngredient(ing)}</li>
            ))}
          </ul>
        </section>
      )}
      {stepList.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-ink">步驟</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-text-body">
            {stepList.map((step, i) => (
              <li key={i}>{formatStep(step)}</li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
