import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicRecipeByToken } from "@/lib/db/queries/sharing";
import { getSiteUrl } from "@/lib/site-url";
import { formatIngredient, formatStep } from "@/lib/recipe-steps";
import { LikeButton } from "@/components/sharing/LikeButton";
import { ShareTargets } from "@/components/sharing/ShareTargets";
import { Button } from "@/components/primitives/Button";
import { ShareViewTracker } from "./ShareViewTracker";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const recipe = await getPublicRecipeByToken(token);
  if (!recipe) {
    return { title: "找不到食譜 | 料理大腦", robots: { index: false, follow: false } };
  }

  const site = getSiteUrl();
  const url = `${site}/r/${token}`;
  const description = recipe.summary?.slice(0, 150) ?? `${recipe.title} — 分享食譜`;

  return {
    title: `${recipe.title} | 料理大腦`,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
      url,
      images: [
        {
          url: `${site}/r/${token}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: false, follow: false },
  };
}

export default async function PublicRecipePage({ params }: PageProps) {
  const { token } = await params;
  const recipe = await getPublicRecipeByToken(token);
  if (!recipe) notFound();

  return (
    <div className="min-h-dvh bg-canvas font-serif text-text-ink">
      <ShareViewTracker token={token} />
      <header className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-sans text-brand-primary hover:underline">
          職人料理大腦
        </Link>
        <Button asChild size="sm" variant="secondary">
          <Link href="/">自己也試試</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-[720px] space-y-8 px-4 pb-16 font-serif">
        {recipe.hero_url && (
          <div className="overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.hero_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}

        <div>
          <h1 className="text-3xl text-text-ink">{recipe.title}</h1>
          <p className="mt-2 text-sm font-sans text-text-muted">
            {recipe.cuisine ? `${recipe.cuisine} · ` : ""}
            {recipe.author_display}
          </p>
          {recipe.summary && (
            <p className="mt-3 font-sans text-text-body">{recipe.summary}</p>
          )}
        </div>

        {recipe.ingredients.length > 0 && (
          <section>
            <h2 className="text-xl">食材</h2>
            <ul className="mt-3 list-inside list-disc font-sans text-text-body">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>{formatIngredient(ing)}</li>
              ))}
            </ul>
          </section>
        )}

        {recipe.steps.length > 0 && (
          <section>
            <h2 className="text-xl">步驟</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 font-sans text-text-body">
              {recipe.steps.map((step, i) => (
                <li key={i}>{formatStep(step)}</li>
              ))}
            </ol>
          </section>
        )}

        <div className="flex flex-col gap-4 border-t border-border-default pt-6 font-sans">
          <LikeButton token={token} initialCount={recipe.like_count} />
          <ShareTargets token={token} />
          <Button asChild>
            <Link href="/">建立自己的食譜</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
