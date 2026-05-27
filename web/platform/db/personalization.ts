/**
 * Personalization memory data layer (PM-1): taste profiles + household members.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { asRows, getSql } from "./client";
import { getDb } from "./drizzle";
import { householdMembers, userTasteProfile } from "./schema";

export type LovedDish = {
  name: string;
  cuisine?: string | null;
  last_loved_at: string;
};

export type TasteProfile = {
  tenant_id: string;
  user_id: string;
  spice_tolerance: number | null;
  sweetness_preference: number | null;
  saltiness_preference: number | null;
  oil_preference: number | null;
  allergies: string[];
  dislikes: string[];
  loved_ingredients: string[];
  loved_dishes: LovedDish[];
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  disliked_cuisines: string[];
  cooking_skill_level: number | null;
  typical_cooking_time_min: number | null;
  notes: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: number;
  tenant_id: string;
  user_id: string;
  name: string;
  relation: string | null;
  age_group: string | null;
  dietary_restrictions: string[];
  allergies: string[];
  dislikes: string[];
  /** Store only what the user volunteers; sensitive — never log this field. */
  medical_conditions: string[];
  texture_needs: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TasteProfileWritable = Partial<
  Pick<
    TasteProfile,
    | "spice_tolerance"
    | "sweetness_preference"
    | "saltiness_preference"
    | "oil_preference"
    | "allergies"
    | "dislikes"
    | "loved_ingredients"
    | "loved_dishes"
    | "dietary_restrictions"
    | "preferred_cuisines"
    | "disliked_cuisines"
    | "cooking_skill_level"
    | "typical_cooking_time_min"
    | "notes"
  >
>;

export type HouseholdMemberWritable = Partial<
  Pick<
    HouseholdMember,
    | "name"
    | "relation"
    | "age_group"
    | "dietary_restrictions"
    | "allergies"
    | "dislikes"
    | "medical_conditions"
    | "texture_needs"
    | "notes"
  >
>;

const CONFIDENCE_FACTORS = 9;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function asLovedDishes(value: unknown): LovedDish[] {
  if (!Array.isArray(value)) return [];
  const out: LovedDish[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    out.push({
      name,
      cuisine: typeof o.cuisine === "string" ? o.cuisine : null,
      last_loved_at:
        typeof o.last_loved_at === "string"
          ? o.last_loved_at
          : new Date().toISOString(),
    });
  }
  return out;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function tasteProfileFromRow(row: Record<string, unknown>): TasteProfile {
  return {
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    spice_tolerance:
      row.spice_tolerance == null ? null : Number(row.spice_tolerance),
    sweetness_preference:
      row.sweetness_preference == null
        ? null
        : Number(row.sweetness_preference),
    saltiness_preference:
      row.saltiness_preference == null
        ? null
        : Number(row.saltiness_preference),
    oil_preference:
      row.oil_preference == null ? null : Number(row.oil_preference),
    allergies: asStringArray(row.allergies),
    dislikes: asStringArray(row.dislikes),
    loved_ingredients: asStringArray(row.loved_ingredients),
    loved_dishes: asLovedDishes(row.loved_dishes),
    dietary_restrictions: asStringArray(row.dietary_restrictions),
    preferred_cuisines: asStringArray(row.preferred_cuisines),
    disliked_cuisines: asStringArray(row.disliked_cuisines),
    cooking_skill_level:
      row.cooking_skill_level == null
        ? null
        : Number(row.cooking_skill_level),
    typical_cooking_time_min:
      row.typical_cooking_time_min == null
        ? null
        : Number(row.typical_cooking_time_min),
    notes: row.notes == null ? null : String(row.notes),
    confidence_score: Number(row.confidence_score ?? 0),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function householdMemberFromRow(row: Record<string, unknown>): HouseholdMember {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    user_id: String(row.user_id),
    name: String(row.name),
    relation: row.relation == null ? null : String(row.relation),
    age_group: row.age_group == null ? null : String(row.age_group),
    dietary_restrictions: asStringArray(row.dietary_restrictions),
    allergies: asStringArray(row.allergies),
    dislikes: asStringArray(row.dislikes),
    medical_conditions: asStringArray(row.medical_conditions),
    texture_needs: asStringArray(row.texture_needs),
    notes: row.notes == null ? null : String(row.notes),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function emptyTasteProfile(tenantId: string, userId: string): TasteProfile {
  const now = new Date().toISOString();
  return {
    tenant_id: tenantId,
    user_id: userId,
    spice_tolerance: null,
    sweetness_preference: null,
    saltiness_preference: null,
    oil_preference: null,
    allergies: [],
    dislikes: [],
    loved_ingredients: [],
    loved_dishes: [],
    dietary_restrictions: [],
    preferred_cuisines: [],
    disliked_cuisines: [],
    cooking_skill_level: null,
    typical_cooking_time_min: null,
    notes: null,
    confidence_score: 0,
    created_at: now,
    updated_at: now,
  };
}

/** Recompute confidence_score per PM-1 spec (9 factors). */
export function computeConfidenceScore(
  profile: Pick<
    TasteProfile,
    | "spice_tolerance"
    | "sweetness_preference"
    | "saltiness_preference"
    | "allergies"
    | "dislikes"
    | "preferred_cuisines"
    | "cooking_skill_level"
    | "typical_cooking_time_min"
  >,
  householdMemberCount: number,
): number {
  let filled = 0;
  if (profile.spice_tolerance != null) filled += 1;
  if (profile.sweetness_preference != null) filled += 1;
  if (profile.saltiness_preference != null) filled += 1;
  if (profile.allergies.length > 0) filled += 1;
  if (profile.dislikes.length > 0) filled += 1;
  if (profile.preferred_cuisines.length > 0) filled += 1;
  if (profile.cooking_skill_level != null) filled += 1;
  if (profile.typical_cooking_time_min != null) filled += 1;
  if (householdMemberCount > 0) filled += 1;
  const score = filled / CONFIDENCE_FACTORS;
  return Math.min(1, Math.max(0, score));
}

async function countHouseholdMembers(
  tenantId: string,
  userId: string,
): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.tenantId, tenantId),
        eq(householdMembers.userId, userId),
      ),
    );
  return Number(row?.count ?? 0);
}

function appendUnique(items: string[], item: string): string[] {
  const trimmed = item.trim();
  if (!trimmed) return items;
  if (items.includes(trimmed)) return items;
  return [...items, trimmed];
}

/** Return profile or null. Never raises on missing row. */
export async function getTasteProfile(
  tenantId: string,
  userId: string,
): Promise<TasteProfile | null> {
  const sql = getSql();
  if (!sql) return null;

  try {
    const rows = await sql`
      SELECT * FROM user_taste_profile
      WHERE tenant_id = ${tenantId} AND user_id = ${userId}
    `;
    const row = asRows<Record<string, unknown>>(rows)[0];
    if (!row) return null;
    return tasteProfileFromRow(row);
  } catch {
    return null;
  }
}

async function refreshTasteConfidenceScore(
  tenantId: string,
  userId: string,
): Promise<void> {
  const householdCount = await countHouseholdMembers(tenantId, userId);
  const existing = await getTasteProfile(tenantId, userId);
  if (!existing) {
    if (householdCount === 0) return;
    await upsertTasteProfile(tenantId, userId, {});
    return;
  }
  const nextScore = computeConfidenceScore(existing, householdCount);
  if (nextScore === existing.confidence_score) return;
  await persistTasteProfile({
    ...existing,
    confidence_score: nextScore,
    updated_at: new Date().toISOString(),
  });
}

async function persistTasteProfile(profile: TasteProfile): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    INSERT INTO user_taste_profile (
      tenant_id, user_id,
      spice_tolerance, sweetness_preference, saltiness_preference, oil_preference,
      allergies, dislikes, loved_ingredients, loved_dishes,
      dietary_restrictions, preferred_cuisines, disliked_cuisines,
      cooking_skill_level, typical_cooking_time_min, notes,
      confidence_score, created_at, updated_at
    ) VALUES (
      ${profile.tenant_id}, ${profile.user_id},
      ${profile.spice_tolerance}, ${profile.sweetness_preference},
      ${profile.saltiness_preference}, ${profile.oil_preference},
      ${JSON.stringify(profile.allergies)}::jsonb,
      ${JSON.stringify(profile.dislikes)}::jsonb,
      ${JSON.stringify(profile.loved_ingredients)}::jsonb,
      ${JSON.stringify(profile.loved_dishes)}::jsonb,
      ${JSON.stringify(profile.dietary_restrictions)}::jsonb,
      ${JSON.stringify(profile.preferred_cuisines)}::jsonb,
      ${JSON.stringify(profile.disliked_cuisines)}::jsonb,
      ${profile.cooking_skill_level}, ${profile.typical_cooking_time_min},
      ${profile.notes}, ${profile.confidence_score},
      ${profile.created_at}::timestamptz, now()
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      spice_tolerance = EXCLUDED.spice_tolerance,
      sweetness_preference = EXCLUDED.sweetness_preference,
      saltiness_preference = EXCLUDED.saltiness_preference,
      oil_preference = EXCLUDED.oil_preference,
      allergies = EXCLUDED.allergies,
      dislikes = EXCLUDED.dislikes,
      loved_ingredients = EXCLUDED.loved_ingredients,
      loved_dishes = EXCLUDED.loved_dishes,
      dietary_restrictions = EXCLUDED.dietary_restrictions,
      preferred_cuisines = EXCLUDED.preferred_cuisines,
      disliked_cuisines = EXCLUDED.disliked_cuisines,
      cooking_skill_level = EXCLUDED.cooking_skill_level,
      typical_cooking_time_min = EXCLUDED.typical_cooking_time_min,
      notes = EXCLUDED.notes,
      confidence_score = EXCLUDED.confidence_score,
      updated_at = now()
  `;
}

/** Insert if not exists, otherwise update only provided fields. */
export async function upsertTasteProfile(
  tenantId: string,
  userId: string,
  fields: TasteProfileWritable,
): Promise<TasteProfile> {
  const existing = await getTasteProfile(tenantId, userId);
  const base = existing ?? emptyTasteProfile(tenantId, userId);
  const merged: TasteProfile = {
    ...base,
    ...fields,
    tenant_id: tenantId,
    user_id: userId,
    allergies: fields.allergies ?? base.allergies,
    dislikes: fields.dislikes ?? base.dislikes,
    loved_ingredients: fields.loved_ingredients ?? base.loved_ingredients,
    loved_dishes: fields.loved_dishes ?? base.loved_dishes,
    dietary_restrictions:
      fields.dietary_restrictions ?? base.dietary_restrictions,
    preferred_cuisines: fields.preferred_cuisines ?? base.preferred_cuisines,
    disliked_cuisines: fields.disliked_cuisines ?? base.disliked_cuisines,
  };
  const householdCount = await countHouseholdMembers(tenantId, userId);
  merged.confidence_score = computeConfidenceScore(merged, householdCount);
  merged.updated_at = new Date().toISOString();
  if (!existing) {
    merged.created_at = merged.updated_at;
  }
  await persistTasteProfile(merged);
  const saved = await getTasteProfile(tenantId, userId);
  return saved ?? merged;
}

async function mutateTasteProfileArrays(
  tenantId: string,
  userId: string,
  mutate: (profile: TasteProfile) => TasteProfile,
): Promise<void> {
  const existing = await getTasteProfile(tenantId, userId);
  const base = existing ?? emptyTasteProfile(tenantId, userId);
  const next = mutate(base);
  const householdCount = await countHouseholdMembers(tenantId, userId);
  next.confidence_score = computeConfidenceScore(next, householdCount);
  next.updated_at = new Date().toISOString();
  if (!existing) next.created_at = next.updated_at;
  await persistTasteProfile(next);
}

export async function addLovedDish(
  tenantId: string,
  userId: string,
  dishName: string,
  cuisine?: string | null,
): Promise<void> {
  const name = dishName.trim();
  if (!name) return;
  await mutateTasteProfileArrays(tenantId, userId, (profile) => {
    const now = new Date().toISOString();
    const without = profile.loved_dishes.filter((d) => d.name !== name);
    const entry: LovedDish = {
      name,
      cuisine: cuisine ?? null,
      last_loved_at: now,
    };
    let loved = [...without, entry];
    const cap = 50;
    if (loved.length > cap) {
      loved = loved.slice(loved.length - cap);
    }
    return { ...profile, loved_dishes: loved };
  });
}

export async function addDislike(
  tenantId: string,
  userId: string,
  item: string,
): Promise<void> {
  await mutateTasteProfileArrays(tenantId, userId, (profile) => ({
    ...profile,
    dislikes: appendUnique(profile.dislikes, item),
  }));
}

export async function addAllergy(
  tenantId: string,
  userId: string,
  item: string,
): Promise<void> {
  await mutateTasteProfileArrays(tenantId, userId, (profile) => ({
    ...profile,
    allergies: appendUnique(profile.allergies, item),
  }));
}

/** Ordered by created_at ASC. */
export async function listHouseholdMembers(
  tenantId: string,
  userId: string,
): Promise<HouseholdMember[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.tenantId, tenantId),
        eq(householdMembers.userId, userId),
      ),
    )
    .orderBy(asc(householdMembers.createdAt));

  return rows.map((row) =>
    householdMemberFromRow(row as unknown as Record<string, unknown>),
  );
}

export async function addHouseholdMember(
  tenantId: string,
  userId: string,
  fields: HouseholdMemberWritable & { name: string },
): Promise<HouseholdMember> {
  const db = getDb();
  if (!db) {
    const now = new Date().toISOString();
    return {
      id: 0,
      tenant_id: tenantId,
      user_id: userId,
      name: fields.name,
      relation: fields.relation ?? null,
      age_group: fields.age_group ?? null,
      dietary_restrictions: fields.dietary_restrictions ?? [],
      allergies: fields.allergies ?? [],
      dislikes: fields.dislikes ?? [],
      medical_conditions: fields.medical_conditions ?? [],
      texture_needs: fields.texture_needs ?? [],
      notes: fields.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  }

  const [row] = await db
    .insert(householdMembers)
    .values({
      tenantId,
      userId,
      name: fields.name,
      relation: fields.relation ?? null,
      ageGroup: fields.age_group ?? null,
      dietaryRestrictions: fields.dietary_restrictions ?? [],
      allergies: fields.allergies ?? [],
      dislikes: fields.dislikes ?? [],
      medicalConditions: fields.medical_conditions ?? [],
      textureNeeds: fields.texture_needs ?? [],
      notes: fields.notes ?? null,
      updatedAt: new Date(),
    })
    .returning();

  await refreshTasteConfidenceScore(tenantId, userId);

  return householdMemberFromRow(row as unknown as Record<string, unknown>);
}

export async function updateHouseholdMember(
  memberId: number,
  tenantId: string,
  userId: string,
  fields: HouseholdMemberWritable,
): Promise<HouseholdMember | null> {
  const db = getDb();
  if (!db) return null;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.relation !== undefined) patch.relation = fields.relation;
  if (fields.age_group !== undefined) patch.ageGroup = fields.age_group;
  if (fields.dietary_restrictions !== undefined) {
    patch.dietaryRestrictions = fields.dietary_restrictions;
  }
  if (fields.allergies !== undefined) patch.allergies = fields.allergies;
  if (fields.dislikes !== undefined) patch.dislikes = fields.dislikes;
  if (fields.medical_conditions !== undefined) {
    patch.medicalConditions = fields.medical_conditions;
  }
  if (fields.texture_needs !== undefined) patch.textureNeeds = fields.texture_needs;
  if (fields.notes !== undefined) patch.notes = fields.notes;

  const [row] = await db
    .update(householdMembers)
    .set(patch)
    .where(
      and(
        eq(householdMembers.id, memberId),
        eq(householdMembers.tenantId, tenantId),
        eq(householdMembers.userId, userId),
      ),
    )
    .returning();

  if (!row) return null;
  return householdMemberFromRow(row as unknown as Record<string, unknown>);
}

export async function deleteHouseholdMember(
  memberId: number,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const deleted = await db
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.id, memberId),
        eq(householdMembers.tenantId, tenantId),
        eq(householdMembers.userId, userId),
      ),
    )
    .returning({ id: householdMembers.id });

  if (deleted.length > 0) {
    await refreshTasteConfidenceScore(tenantId, userId);
  }

  return deleted.length > 0;
}

/** GDPR-style wipe for both personalization tables. */
export async function deleteAllPersonalization(
  tenantId: string,
  userId: string,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  await sql`
    DELETE FROM household_members
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
  await sql`
    DELETE FROM user_taste_profile
    WHERE tenant_id = ${tenantId} AND user_id = ${userId}
  `;
}
