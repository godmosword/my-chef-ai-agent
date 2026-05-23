import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicRecipeByToken } from "@/lib/db/queries/sharing";
import { getSiteUrl } from "@/lib/site-url";
import { LikeButton } from "@/components/sharing/LikeButton";
import { ShareTargets } from "@/components/sharing/ShareTargets";
import { Button } from "@/components/primitives/Button";
import { Chip } from "@/components/primitives/Chip";
import { RecipeDetailSections } from "@/components/recipe/RecipeDetailSections";
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
  const ogImages = recipe.hero_url
    ? [{ url: recipe.hero_url, width: 1200, height: 630, alt: recipe.title }]
    : [{ url: `${site}/r/${token}/opengraph-image`, width: 1200, height: 630 }];

  return {
    title: `${recipe.title} | 料理大腦`,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
      url,
      images: ogImages,
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
    <div className="min-h-dvh bg-canvas text-text-ink">
      <ShareViewTracker token={token} />
      <header className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm text-brand-primary hover:underline">
          職人料理大腦
        </Link>
        <Button asChild size="sm" variant="secondary">
          <Link href="/">自己也試試</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-[720px] px-4 pb-16">
        <article>
          {recipe.hero_url ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border-default">
              <Image
                src={recipe.hero_url}
                alt={recipe.title}
                fill
                className="object-cover"
                sizes="(max-width: 720px) 100vw, 720px"
                unoptimized
                priority
              />
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            <h1 className="font-serif text-3xl text-text-ink">{recipe.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {recipe.cuisine ? <Chip label={recipe.cuisine} /> : null}
              <span className="text-sm text-text-muted">{recipe.author_display}</span>
            </div>
            {recipe.summary ? (
              <p className="text-text-muted">{recipe.summary}</p>
            ) : null}
          </div>

          <div className="mt-6 space-y-6">
            <RecipeDetailSections
              ingredients={recipe.ingredients}
              steps={recipe.steps}
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border-default pt-6">
            <LikeButton token={token} initialCount={recipe.like_count} />
            <ShareTargets token={token} />
            <Button asChild>
              <Link href="/">建立自己的食譜</Link>
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
