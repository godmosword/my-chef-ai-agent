import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { PublicRecipe } from "@chef/shared-types";
import { getDb } from "../drizzle";
import {
  recipeVersions,
  recipes,
  sharedRecipeLikes,
  sharedRecipeViews,
} from "../schema";
import { countUserRecipes } from "./recipe-counts";
import { generateShareToken } from "@/platform/identity/token";

const AUTHOR_DISPLAY = "匿名主廚";
type DbClient = NonNullable<ReturnType<typeof getDb>>;
type ShareMetaRow = {
  shareToken: string | null;
  publishedAt: Date | null;
};
type SharedRecipeLikeTarget = {
  id: string;
  likeCount: number;
};

export type ShareMeta = {
  share_token: string;
  share_url: string;
  published_at: string;
};

function shareMetaFromRow(
  row: ShareMetaRow,
  shareUrl: (token: string) => string,
): ShareMeta {
  return {
    share_token: row.shareToken!,
    share_url: shareUrl(row.shareToken!),
    published_at: row.publishedAt!.toISOString(),
  };
}

async function getSharedRecipeLikeTarget(
  db: DbClient,
  token: string,
): Promise<SharedRecipeLikeTarget | null> {
  const [recipe] = await db
    .select({ id: recipes.id, likeCount: recipes.likeCount })
    .from(recipes)
    .where(and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)))
    .limit(1);

  return recipe ?? null;
}

async function updateSharePublicationWithRetry(
  db: DbClient,
  options: {
    latestVersionId: string;
    where: SQL | undefined;
    shareUrl: (token: string) => string;
    requireReturnedToken?: boolean;
    onEmptyUpdate?: () => Promise<ShareMeta | null>;
  },
): Promise<ShareMeta | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateShareToken();
    const now = new Date();
    try {
      const updated = await db
        .update(recipes)
        .set({
          shareToken: token,
          publishedAt: now,
          publishedVersionId: options.latestVersionId,
          updatedAt: now,
        })
        .where(options.where)
        .returning({
          shareToken: recipes.shareToken,
          publishedAt: recipes.publishedAt,
        });

      if (
        updated.length &&
        (!options.requireReturnedToken || updated[0]!.shareToken)
      ) {
        return shareMetaFromRow(updated[0]!, options.shareUrl);
      }

      const meta = await options.onEmptyUpdate?.();
      if (meta) return meta;
    } catch {
      /* retry */
    }
  }

  return null;
}

export async function publishRecipeShare(
  userId: string,
  tenantId: string,
  recipeId: string,
  shareUrl: (token: string) => string,
): Promise<ShareMeta | null> {
  const db = getDb();
  if (!db) return null;

  const [existing] = await db
    .select({
      shareToken: recipes.shareToken,
      publishedAt: recipes.publishedAt,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, recipeId),
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
        isNull(recipes.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return null;

  if (existing.shareToken && existing.publishedAt) {
    return shareMetaFromRow(existing, shareUrl);
  }

  const [row] = await db
    .select({ latestVersionId: recipes.latestVersionId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!row?.latestVersionId) return null;

  return updateSharePublicationWithRetry(db, {
    latestVersionId: row.latestVersionId,
    shareUrl,
    where: and(
      eq(recipes.id, recipeId),
      eq(recipes.userId, userId),
      isNull(recipes.shareToken),
    ),
    onEmptyUpdate: async () => {
      const [again] = await db
        .select({
          shareToken: recipes.shareToken,
          publishedAt: recipes.publishedAt,
        })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);
      if (again?.shareToken && again.publishedAt) {
        return shareMetaFromRow(again, shareUrl);
      }
      return null;
    },
  });
}

export async function republishRecipeShare(
  userId: string,
  tenantId: string,
  recipeId: string,
  shareUrl: (token: string) => string,
): Promise<ShareMeta | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({ latestVersionId: recipes.latestVersionId })
    .from(recipes)
    .where(
      and(
        eq(recipes.id, recipeId),
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
        isNull(recipes.deletedAt),
      ),
    )
    .limit(1);

  if (!row?.latestVersionId) return null;

  return updateSharePublicationWithRetry(db, {
    latestVersionId: row.latestVersionId,
    shareUrl,
    where: and(
      eq(recipes.id, recipeId),
      eq(recipes.userId, userId),
      eq(recipes.tenantId, tenantId),
    ),
    requireReturnedToken: true,
  });
}

export async function revokeRecipeShare(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .update(recipes)
    .set({ shareToken: null, updatedAt: new Date() })
    .where(
      and(
        eq(recipes.id, recipeId),
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
        isNull(recipes.deletedAt),
      ),
    )
    .returning({ id: recipes.id });

  return result.length > 0;
}

export async function getPublicRecipeByToken(
  token: string,
): Promise<PublicRecipe | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(recipes)
    .where(
      and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)),
    )
    .limit(1);

  if (!row?.publishedVersionId || !row.publishedAt) return null;

  const [version] = await db
    .select()
    .from(recipeVersions)
    .where(eq(recipeVersions.id, row.publishedVersionId))
    .limit(1);

  if (!version) return null;

  return {
    title: row.title,
    cuisine: row.cuisine,
    summary: row.summary,
    hero_url: row.heroUrl,
    ingredients: version.ingredients as unknown[],
    steps: version.steps as unknown[],
    author_display: AUTHOR_DISPLAY,
    view_count: row.viewCount,
    like_count: row.likeCount,
    published_at: row.publishedAt.toISOString(),
    snapshot_version: version.versionNo,
  };
}

export async function recordPublicView(
  token: string,
  visitorId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const [recipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)))
    .limit(1);

  if (!recipe) return false;

  const inserted = await db
    .insert(sharedRecipeViews)
    .values({ recipeId: recipe.id, visitorId })
    .onConflictDoNothing()
    .returning({ recipeId: sharedRecipeViews.recipeId });

  if (!inserted.length) return false;

  await db
    .update(recipes)
    .set({ viewCount: sql`${recipes.viewCount} + 1` })
    .where(eq(recipes.id, recipe.id));

  return true;
}

export async function addPublicLike(
  token: string,
  visitorId: string,
): Promise<{ like_count: number; liked: boolean } | null> {
  const db = getDb();
  if (!db) return null;

  const recipe = await getSharedRecipeLikeTarget(db, token);
  if (!recipe) return null;

  const inserted = await db
    .insert(sharedRecipeLikes)
    .values({ recipeId: recipe.id, visitorId })
    .onConflictDoNothing()
    .returning({ recipeId: sharedRecipeLikes.recipeId });

  let count = recipe.likeCount;
  if (inserted.length) {
    const [updated] = await db
      .update(recipes)
      .set({ likeCount: sql`${recipes.likeCount} + 1` })
      .where(eq(recipes.id, recipe.id))
      .returning({ likeCount: recipes.likeCount });
    count = updated?.likeCount ?? count + 1;
  }

  return { like_count: count, liked: true };
}

export async function removePublicLike(
  token: string,
  visitorId: string,
): Promise<{ like_count: number; liked: boolean } | null> {
  const db = getDb();
  if (!db) return null;

  const recipe = await getSharedRecipeLikeTarget(db, token);
  if (!recipe) return null;

  const deleted = await db
    .delete(sharedRecipeLikes)
    .where(
      and(
        eq(sharedRecipeLikes.recipeId, recipe.id),
        eq(sharedRecipeLikes.visitorId, visitorId),
      ),
    )
    .returning({ recipeId: sharedRecipeLikes.recipeId });

  let count = recipe.likeCount;
  if (deleted.length && count > 0) {
    const [updated] = await db
      .update(recipes)
      .set({ likeCount: sql`${recipes.likeCount} - 1` })
      .where(eq(recipes.id, recipe.id))
      .returning({ likeCount: recipes.likeCount });
    count = updated?.likeCount ?? Math.max(0, count - 1);
  }

  return { like_count: count, liked: false };
}

export async function countSharedRecipesForUser(
  userId: string,
  tenantId: string,
): Promise<number> {
  return countUserRecipes(userId, tenantId, sql`${recipes.shareToken} IS NOT NULL`);
}
