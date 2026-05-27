import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingMutation } from "./db";

const recordRecipeCook = vi.fn();
const dequeuePendingRating = vi.fn();

vi.mock("@/application/api/recipes", () => ({
  recordRecipeCook,
  addFavoriteByRecipeId: vi.fn(),
  removeFavoriteByRecipeId: vi.fn(),
}));

vi.mock("@/domain/cook/ratingQueue", () => ({
  dequeuePendingRating,
  loadPendingRatings: () => [],
}));

vi.mock("./network", () => ({
  isBrowserOnline: () => true,
}));

const pending: PendingMutation[] = [];

vi.mock("./db", () => ({
  getOfflineDb: () => ({
    mutations: {
      add: async (m: PendingMutation) => {
        pending.push(m);
      },
      orderBy: () => ({
        toArray: async () => [...pending].sort((a, b) => a.created_at - b.created_at),
      }),
      delete: async (id: string) => {
        const i = pending.findIndex((m) => m.id === id);
        if (i >= 0) pending.splice(i, 1);
      },
      update: async (id: string, patch: Partial<PendingMutation>) => {
        const m = pending.find((x) => x.id === id);
        if (m) Object.assign(m, patch);
      },
    },
  }),
  OFFLINE_DEVICE_USER: "device",
}));

describe("flushMutations rating", () => {
  beforeEach(() => {
    pending.length = 0;
    recordRecipeCook.mockReset();
    recordRecipeCook.mockResolvedValue(undefined);
    dequeuePendingRating.mockReset();
  });

  it("flushes rating mutation via recordRecipeCook", async () => {
    const { enqueueMutation, flushMutations } = await import("./mutations");

    await enqueueMutation({
      type: "rating",
      payload: { recipe_id: "recipe-1", rating: 5 },
    });

    expect(pending).toHaveLength(1);

    await flushMutations();

    expect(recordRecipeCook).toHaveBeenCalledWith("recipe-1", {
      rating: 5,
      record_cook: true,
    });
    expect(dequeuePendingRating).toHaveBeenCalledWith("recipe-1");
    expect(pending).toHaveLength(0);
  });
});
