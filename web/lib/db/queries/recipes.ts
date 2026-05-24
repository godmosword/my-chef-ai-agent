import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { RecipePayload as AiRecipePayload } from "@/lib/ai/generate-recipe";
import {
  aiRecipeToPayload,
  buildTagsFromContext,
  costToJsonb,
  normalizeTag,
} from "@/lib/recipe-payload";
import type {
  HeroStatus,
  ListRecipesQuery,
  RecipePayload,
  RecipeTag,
  RecipeWithLatestVersion,
} from "@chef/shared-types";
import { ensureStoredSteps } from "@/lib/hero/step-storage";
import { getDb } from "../drizzle";
import {
  favoritesV2,
  recipeTags,
  recipeVersions,
  recipes,
} from "../schema";

export type CreateRecipeInput = {
  userId: string;
  tenantId: string;
  aiRecipe: AiRecipePayload;
  sourcePrompt: string;
  contextTags?: string[];
  modelUsed?: string;
  deepResearch?: boolean;
  aiTags?: string[];
};

function rowToRecipePayload(
  row: typeof recipes.$inferSelect,
  version: typeof recipeVersions.$inferSelect,
  tags: RecipeTag[],
): RecipePayload {
  const payload = aiRecipeToPayload(
    {
      recipe_name: row.title,
      theme: row.cuisine ?? undefined,
      kitchen_talk: parseKitchenTalk(version.kitchenTalk),
      ingredients: version.ingredients as AiRecipePayload["ingredients"],
      steps: version.steps as AiRecipePayload["steps"],
      shopping_list: version.shoppingList as AiRecipePayload["shopping_list"],
      estimated_total_cost: costFromJsonb(version.costEstimate),
      photo_url: row.heroUrl ?? undefined,
      prep_minutes: version.prepMinutes ?? undefined,
      cook_minutes: version.cookMinutes ?? undefined,
      servings: version.servings ?? undefined,
    },
    { id: row.id, version_no: version.versionNo },
    tags,
  );
  return {
    ...payload,
    photo_url: row.heroUrl ?? payload.photo_url,
    hero_status: row.heroStatus as HeroStatus,
    hero_error: row.heroError ?? null,
    share_token: row.shareToken ?? null,
    published_at: row.publishedAt?.toISOString() ?? null,
  };
}

function initialHeroStatus(aiRecipe: AiRecipePayload): HeroStatus {
  if (aiRecipe.photo_url?.trim()) return "ready";
  return "pending";
}

function parseKitchenTalk(
  raw: string | null | undefined,
): AiRecipePayload["kitchen_talk"] {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as AiRecipePayload["kitchen_talk"];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* legacy line format */
  }
  return raw.split("\n").filter(Boolean).map((line) => {
    const idx = line.indexOf(":");
    if (idx < 0) return { role: "chef", content: line };
    return { role: line.slice(0, idx).trim(), content: line.slice(idx + 1).trim() };
  });
}

function costFromJsonb(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const o = value as { display?: string };
  return o.display;
}

function serializeKitchenTalk(
  talks: AiRecipePayload["kitchen_talk"],
): string | null {
  if (!talks?.length) return null;
  return JSON.stringify(talks);
}

export async function createRecipeFromAi(
  input: CreateRecipeInput,
): Promise<RecipePayload | null> {
  const db = getDb();
  if (!db) return null;

  const title = (input.aiRecipe.recipe_name || "未命名食譜").trim();
  const cuisine = input.aiRecipe.theme?.trim() || null;
  const tagRows = buildTagsFromContext(
    input.contextTags,
    cuisine,
    input.aiTags,
  );

  return db.transaction(async (tx) => {
    const [recipeRow] = await tx
      .insert(recipes)
      .values({
        userId: input.userId,
        tenantId: input.tenantId,
        title,
        cuisine,
        summary: title,
        heroUrl: input.aiRecipe.photo_url ?? null,
        heroStatus: initialHeroStatus(input.aiRecipe),
        heroError: null,
        heroUpdatedAt: input.aiRecipe.photo_url ? new Date() : null,
      })
      .returning();

    const [versionRow] = await tx
      .insert(recipeVersions)
      .values({
        recipeId: recipeRow.id,
        versionNo: 1,
        ingredients: input.aiRecipe.ingredients ?? [],
        steps: ensureStoredSteps(input.aiRecipe.steps ?? []),
        shoppingList: input.aiRecipe.shopping_list ?? [],
        kitchenTalk: serializeKitchenTalk(input.aiRecipe.kitchen_talk),
        costEstimate: costToJsonb(input.aiRecipe.estimated_total_cost),
        sourcePrompt: input.sourcePrompt,
        modelUsed: input.modelUsed ?? null,
        deepResearch: input.deepResearch ?? false,
        prepMinutes: input.aiRecipe.prep_minutes ?? null,
        cookMinutes: input.aiRecipe.cook_minutes ?? null,
        servings: input.aiRecipe.servings ?? null,
      })
      .returning();

    await tx
      .update(recipes)
      .set({ latestVersionId: versionRow.id })
      .where(eq(recipes.id, recipeRow.id));

    if (tagRows.length) {
      await tx.insert(recipeTags).values(
        tagRows.map((t) => ({
          recipeId: recipeRow.id,
          tag: t.tag,
          source: t.source,
        })),
      );
    }

    const tags: RecipeTag[] = tagRows.map((t) => ({
      tag: t.tag,
      source: t.source,
    }));
    return rowToRecipePayload(
      { ...recipeRow, latestVersionId: versionRow.id },
      versionRow,
      tags,
    );
  });
}

export async function listRecipesForUser(
  userId: string,
  tenantId: string,
  query: ListRecipesQuery,
): Promise<{ items: RecipeWithLatestVersion[]; next_cursor: string | null }> {
  const db = getDb();
  if (!db) return { items: [], next_cursor: null };

  const limit = query.limit ?? 20;
  const conditions = [
    eq(recipes.userId, userId),
    eq(recipes.tenantId, tenantId),
    isNull(recipes.deletedAt),
  ];

  if (query.cuisine) {
    conditions.push(eq(recipes.cuisine, query.cuisine));
  }
  if (query.q) {
    conditions.push(
      ilike(recipes.title, `%${query.q.replace(/%/g, "\\%")}%`),
    );
  }

  let favoriteIds: string[] | null = null;
  if (query.favorite_only) {
    const favs = await db
      .select({ recipeId: favoritesV2.recipeId })
      .from(favoritesV2)
      .where(
        and(
          eq(favoritesV2.userId, userId),
          eq(favoritesV2.tenantId, tenantId),
        ),
      );
    favoriteIds = favs.map((f) => f.recipeId);
    if (!favoriteIds.length) {
      return { items: [], next_cursor: null };
    }
    conditions.push(inArray(recipes.id, favoriteIds));
  }

  if (query.tag) {
    const tagged = await db
      .select({ recipeId: recipeTags.recipeId })
      .from(recipeTags)
      .where(eq(recipeTags.tag, normalizeTag(query.tag)));
    const ids = tagged.map((t) => t.recipeId);
    if (!ids.length) return { items: [], next_cursor: null };
    conditions.push(inArray(recipes.id, ids));
  }

  if (query.cursor) {
    try {
      const [ts, id] = Buffer.from(query.cursor, "base64url")
        .toString("utf8")
        .split("|");
      if (ts && id) {
        conditions.push(
          sql`(${recipes.updatedAt}, ${recipes.id}) < (${ts}::timestamptz, ${id}::uuid)`,
        );
      }
    } catch {
      /* ignore bad cursor */
    }
  }

  const rows = await db
    .select()
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.updatedAt), desc(recipes.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const versionIds = page
    .map((r) => r.latestVersionId)
    .filter((id): id is string => Boolean(id));

  const versions =
    versionIds.length > 0
      ? await db
          .select()
          .from(recipeVersions)
          .where(inArray(recipeVersions.id, versionIds))
      : [];
  const versionById = new Map(versions.map((v) => [v.id, v]));

  const recipeIds = page.map((r) => r.id);
  const allTags =
    recipeIds.length > 0
      ? await db
          .select()
          .from(recipeTags)
          .where(inArray(recipeTags.recipeId, recipeIds))
      : [];
  const tagsByRecipe = new Map<string, RecipeTag[]>();
  for (const t of allTags) {
    const list = tagsByRecipe.get(t.recipeId) ?? [];
    list.push({ tag: t.tag, source: t.source as RecipeTag["source"] });
    tagsByRecipe.set(t.recipeId, list);
  }

  const items: RecipeWithLatestVersion[] = page.map((row) => {
    const ver = row.latestVersionId
      ? versionById.get(row.latestVersionId)
      : undefined;
    return {
      id: row.id,
      user_id: row.userId,
      title: row.title,
      cuisine: row.cuisine,
      summary: row.summary,
      hero_url: row.heroUrl,
      hero_status: row.heroStatus as HeroStatus,
      hero_error: row.heroError,
      poster_url: row.posterUrl,
      latest_version_id: row.latestVersionId,
      rating: row.rating,
      cook_count: row.cookCount,
      last_cooked_at: row.lastCookedAt?.toISOString() ?? null,
      tags: tagsByRecipe.get(row.id) ?? [],
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      version_no: ver?.versionNo,
      latest_version: ver
        ? {
            id: ver.id,
            recipe_id: ver.recipeId,
            version_no: ver.versionNo,
            ingredients: ver.ingredients as unknown[],
            steps: ver.steps as unknown[],
            shopping_list: ver.shoppingList as unknown[],
            kitchen_talk: ver.kitchenTalk,
            cost_estimate: ver.costEstimate,
            source_prompt: ver.sourcePrompt,
            diff_from_prompt: ver.diffFromPrompt,
            model_used: ver.modelUsed,
            deep_research: ver.deepResearch,
            created_at: ver.createdAt.toISOString(),
          }
        : null,
    };
  });

  let next_cursor: string | null = null;
  if (hasMore && page.length) {
    const last = page[page.length - 1];
    next_cursor = Buffer.from(
      `${last.updatedAt.toISOString()}|${last.id}`,
      "utf8",
    ).toString("base64url");
  }

  return { items, next_cursor };
}

export async function getRecipeForUser(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<RecipePayload | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
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

  const [version] = await db
    .select()
    .from(recipeVersions)
    .where(eq(recipeVersions.id, row.latestVersionId))
    .limit(1);

  if (!version) return null;

  const tags = await db
    .select()
    .from(recipeTags)
    .where(eq(recipeTags.recipeId, recipeId));

  return rowToRecipePayload(
    row,
    version,
    tags.map((t) => ({
      tag: t.tag,
      source: t.source as RecipeTag["source"],
    })),
  );
}

export async function softDeleteRecipe(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .update(recipes)
    .set({ deletedAt: new Date() })
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

export async function addRecipeTag(
  userId: string,
  tenantId: string,
  recipeId: string,
  tag: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const normalized = normalizeTag(tag);
  if (!normalized) return false;

  const [row] = await db
    .select({ id: recipes.id })
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

  if (!row) return false;

  await db
    .insert(recipeTags)
    .values({ recipeId, tag: normalized, source: "user" })
    .onConflictDoNothing();

  return true;
}

export async function listRecipeVersions(
  userId: string,
  tenantId: string,
  recipeId: string,
) {
  const db = getDb();
  if (!db) return [];

  const [row] = await db
    .select({ id: recipes.id })
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

  if (!row) return [];

  return db
    .select()
    .from(recipeVersions)
    .where(eq(recipeVersions.recipeId, recipeId))
    .orderBy(desc(recipeVersions.versionNo));
}

export async function patchRecipeMeta(
  userId: string,
  tenantId: string,
  recipeId: string,
  opts: { rating?: number; recordCook?: boolean },
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const [row] = await db
    .select({ cookCount: recipes.cookCount })
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

  if (!row) return false;

  const patch: Partial<typeof recipes.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (opts.rating != null) patch.rating = opts.rating;
  if (opts.recordCook) {
    patch.cookCount = row.cookCount + 1;
    patch.lastCookedAt = new Date();
  }

  const result = await db
    .update(recipes)
    .set(patch)
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

export async function countRecipesForUser(
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
      ),
    );

  return rows.length;
}

export type RecipeActivity = {
  total: number;
  first_recipe_at: string | null;
  last_recipe_at: string | null;
  active_dates: string[];
};

export async function getRecipeActivityForUser(
  userId: string,
  tenantId: string,
): Promise<RecipeActivity> {
  const db = getDb();
  if (!db)
    return { total: 0, first_recipe_at: null, last_recipe_at: null, active_dates: [] };

  const rows = await db
    .select({ createdAt: recipes.createdAt })
    .from(recipes)
    .where(
      and(
        eq(recipes.userId, userId),
        eq(recipes.tenantId, tenantId),
        isNull(recipes.deletedAt),
      ),
    )
    .orderBy(desc(recipes.createdAt));

  if (rows.length === 0)
    return { total: 0, first_recipe_at: null, last_recipe_at: null, active_dates: [] };

  const dateSet = new Set<string>();
  for (const row of rows) {
    dateSet.add(row.createdAt.toISOString().slice(0, 10));
  }

  return {
    total: rows.length,
    first_recipe_at: rows[rows.length - 1].createdAt.toISOString(),
    last_recipe_at: rows[0].createdAt.toISOString(),
    active_dates: Array.from(dateSet),
  };
}

export async function getRecipeHeroStatus(
  userId: string,
  tenantId: string,
  recipeId: string,
): Promise<{
  hero_status: HeroStatus;
  hero_url: string | null;
  hero_error: string | null;
} | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      heroStatus: recipes.heroStatus,
      heroUrl: recipes.heroUrl,
      heroError: recipes.heroError,
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

  if (!row) return null;
  return {
    hero_status: row.heroStatus as HeroStatus,
    hero_url: row.heroUrl,
    hero_error: row.heroError,
  };
}

export async function updateRecipeHeroUrl(
  userId: string,
  tenantId: string,
  recipeId: string,
  heroUrl: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .update(recipes)
    .set({
      heroUrl,
      heroStatus: "ready",
      heroError: null,
      heroUpdatedAt: new Date(),
    })
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
