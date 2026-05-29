import Dexie, { type Table } from "dexie";
import type { RecipePayload } from "@chef/shared-types";

export const OFFLINE_DEVICE_USER = "device";

export interface OfflineRecipe {
  id: string;
  user_id: string;
  data: RecipePayload;
  cached_at: number;
}

export type MutationType =
  | "favorite_add"
  | "favorite_remove"
  | "rating"
  | "record_cook"
  | "tag_add"
  | "tag_remove";

export interface PendingMutation {
  id: string;
  type: MutationType;
  payload: unknown;
  created_at: number;
  retries: number;
}

class ChefDB extends Dexie {
  recipes!: Table<OfflineRecipe, string>;
  mutations!: Table<PendingMutation, string>;

  constructor() {
    super("chef-offline");
    this.version(1).stores({
      recipes: "id, user_id, cached_at",
      mutations: "id, type, created_at",
    });
  }
}

let dbInstance: ChefDB | null = null;

export function getOfflineDb(): ChefDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!dbInstance) {
    dbInstance = new ChefDB();
  }
  return dbInstance;
}
