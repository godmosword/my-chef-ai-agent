/**
 * Drizzle schema for Recipe Library tables (Postgres).
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    tenantId: text("tenant_id").notNull().default("default"),
    title: text("title").notNull(),
    cuisine: text("cuisine"),
    summary: text("summary"),
    heroUrl: text("hero_url"),
    posterUrl: text("poster_url"),
    latestVersionId: uuid("latest_version_id"),
    rating: smallint("rating"),
    cookCount: integer("cook_count").notNull().default(0),
    lastCookedAt: timestamp("last_cooked_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUpdatedIdx: index("idx_recipes_user_updated").on(
      t.userId,
      t.tenantId,
      t.updatedAt,
    ),
  }),
);

export const recipeVersions = pgTable(
  "recipe_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    ingredients: jsonb("ingredients").notNull().default([]),
    steps: jsonb("steps").notNull().default([]),
    shoppingList: jsonb("shopping_list").notNull().default([]),
    kitchenTalk: text("kitchen_talk"),
    costEstimate: jsonb("cost_estimate"),
    sourcePrompt: text("source_prompt").notNull(),
    diffFromPrompt: text("diff_from_prompt"),
    modelUsed: text("model_used"),
    deepResearch: boolean("deep_research").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    recipeVersionIdx: index("idx_recipe_versions_recipe_version").on(
      t.recipeId,
      t.versionNo,
    ),
  }),
);

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    source: text("source").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.tag] }),
    tagIdx: index("idx_recipe_tags_tag").on(t.tag),
  }),
);

export const favoritesV2 = pgTable(
  "favorites_v2",
  {
    userId: text("user_id").notNull(),
    tenantId: text("tenant_id").notNull().default("default"),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.tenantId, t.recipeId] }),
  }),
);

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    tenantId: text("tenant_id").notNull().default("default"),
    planDate: date("plan_date").notNull(),
    slot: text("slot").notNull(),
    recipeId: uuid("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    recipeVersionId: uuid("recipe_version_id").references(
      () => recipeVersions.id,
      { onDelete: "set null" },
    ),
    servings: integer("servings").notNull().default(2),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userDateSlotUnq: uniqueIndex("meal_plans_user_date_slot_unq").on(
      t.userId,
      t.tenantId,
      t.planDate,
      t.slot,
    ),
    userWeek: index("idx_meal_plans_user_week").on(
      t.userId,
      t.tenantId,
      t.planDate,
    ),
  }),
);

export const usageDaily = pgTable(
  "usage_daily",
  {
    tenantId: text("tenant_id").notNull().default("default"),
    userId: text("user_id").notNull(),
    usageDate: date("usage_date").notNull(),
    requestsCount: integer("requests_count").notNull().default(0),
    textRequestsCount: integer("text_requests_count").notNull().default(0),
    imageRequestsCount: integer("image_requests_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.userId, t.usageDate] }),
  }),
);
