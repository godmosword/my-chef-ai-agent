import { and, eq, isNull, sql } from "drizzle-orm";
import type { PublicRecipe } from "@chef/shared-types";
import { getDb } from "../drizzle";
import {
  recipeVersions,
  recipes,
  sharedRecipeLikes,
  sharedRecipeViews,
} from "../schema";
import { generateShareToken } from "@/platform/identity/token";

const AUTHOR_DISPLAY = "匿名主廚";

export type ShareMeta = {
  share_token: string;
  share_url: string;
  published_at: string;
};

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
    return {
      share_token: existing.shareToken,
      share_url: shareUrl(existing.shareToken),
      published_at: existing.publishedAt.toISOString(),
    };
  }

  const [row] = await db
    .select({ latestVersionId: recipes.latestVersionId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!row?.latestVersionId) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateShareToken();
    const now = new Date();
    try {
      const updated = await db
        .update(recipes)
        .set({
          shareToken: token,
          publishedAt: now,
          publishedVersionId: row.latestVersionId,
          updatedAt: now,
        })
        .where(
          and(
            eq(recipes.id, recipeId),
            eq(recipes.userId, userId),
            isNull(recipes.shareToken),
          ),
        )
        .returning({
          shareToken: recipes.shareToken,
          publishedAt: recipes.publishedAt,
        });

      if (updated.length) {
        return {
          share_token: updated[0]!.shareToken!,
          share_url: shareUrl(updated[0]!.shareToken!),
          published_at: updated[0]!.publishedAt!.toISOString(),
        };
      }

      const [again] = await db
        .select({
          shareToken: recipes.shareToken,
          publishedAt: recipes.publishedAt,
        })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);
      if (again?.shareToken && again.publishedAt) {
        return {
          share_token: again.shareToken,
          share_url: shareUrl(again.shareToken),
          published_at: again.publishedAt.toISOString(),
        };
      }
    } catch {
      /* unique violation — retry */
    }
  }

  return null;
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

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateShareToken();
    const now = new Date();
    try {
      const updated = await db
        .update(recipes)
        .set({
          shareToken: token,
          publishedAt: now,
          publishedVersionId: row.latestVersionId,
          updatedAt: now,
        })
        .where(
          and(
            eq(recipes.id, recipeId),
            eq(recipes.userId, userId),
            eq(recipes.tenantId, tenantId),
          ),
        )
        .returning({
          shareToken: recipes.shareToken,
          publishedAt: recipes.publishedAt,
        });

      if (updated.length && updated[0]!.shareToken) {
        return {
          share_token: updated[0]!.shareToken,
          share_url: shareUrl(updated[0]!.shareToken),
          published_at: updated[0]!.publishedAt!.toISOString(),
        };
      }
    } catch {
      /* retry */
    }
  }

  return null;
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

  const [recipe] = await db
    .select({ id: recipes.id, likeCount: recipes.likeCount })
    .from(recipes)
    .where(and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)))
    .limit(1);

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

  const [recipe] = await db
    .select({ id: recipes.id, likeCount: recipes.likeCount })
    .from(recipes)
    .where(and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)))
    .limit(1);

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
  const db = getDb();
  if (!db) return 0;

  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      and(
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
        isNull(recipes.deletedAt),
        sql`${recipes.shareToken} IS NOT NULL`,
      ),
    );

  return rows.length;
}
