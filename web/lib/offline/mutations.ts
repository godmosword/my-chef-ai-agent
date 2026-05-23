import {
  addFavoriteByRecipeId,
  recordRecipeCook,
  removeFavoriteById,
} from "@/lib/api/recipes";
import {
  dequeuePendingRating,
  loadPendingRatings,
  type PendingRating,
} from "@/lib/cooking/ratingQueue";
import {
  getOfflineDb,
  type MutationType,
  type PendingMutation,
} from "./db";
import { isBrowserOnline } from "./network";

export async function enqueueMutation(
  m: Omit<PendingMutation, "id" | "created_at" | "retries">,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  await db.mutations.add({
    id: crypto.randomUUID(),
    created_at: Date.now(),
    retries: 0,
    ...m,
  });
  if (isBrowserOnline()) {
    void flushMutations();
  }
}

async function sendMutation(m: PendingMutation): Promise<void> {
  switch (m.type as MutationType) {
    case "favorite_add": {
      const { recipe_id } = m.payload as { recipe_id: string };
      await addFavoriteByRecipeId(recipe_id);
      return;
    }
    case "favorite_remove": {
      const { favorite_id } = m.payload as { favorite_id: number };
      await removeFavoriteById(favorite_id);
      return;
    }
    case "rating": {
      const { recipe_id, rating } = m.payload as {
        recipe_id: string;
        rating: number;
      };
      await recordRecipeCook(recipe_id, { rating, record_cook: true });
      dequeuePendingRating(recipe_id);
      return;
    }
    default:
      throw new Error(`Unsupported mutation: ${m.type}`);
  }
}

export async function flushMutations(): Promise<void> {
  const db = getOfflineDb();
  if (!db || !isBrowserOnline()) return;

  const pending = await db.mutations.orderBy("created_at").toArray();
  for (const m of pending) {
    try {
      await sendMutation(m);
      await db.mutations.delete(m.id);
    } catch {
      const retries = m.retries + 1;
      if (retries > 5) {
        await db.mutations.delete(m.id);
      } else {
        await db.mutations.update(m.id, { retries });
      }
    }
  }
}

/** Migrate legacy localStorage rating queue into Dexie + flush. */
export async function migrateLegacyRatingQueue(): Promise<void> {
  const legacy: PendingRating[] = loadPendingRatings();
  for (const item of legacy) {
    await enqueueMutation({
      type: "rating",
      payload: { recipe_id: item.recipeId, rating: item.rating },
    });
    dequeuePendingRating(item.recipeId);
  }
}
