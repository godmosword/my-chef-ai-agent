import { redirect } from "next/navigation";
import { DEFAULT_TENANT_ID } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getRecipeForUser } from "@/lib/db/queries/recipes";
import { recipePayloadToCooking } from "@/lib/cooking/normalizeSteps";
import { getSessionUserId } from "@/lib/session";
import { CookPageClient } from "./CookPageClient";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string; voice?: string }>;
};

export default async function CookPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const userId = await getSessionUserId();

  if (!userId || !isDatabaseConfigured()) {
    redirect(`/app/library/${id}`);
  }

  const payload = await getRecipeForUser(userId, DEFAULT_TENANT_ID, id);
  if (!payload?.id) {
    redirect(`/app/library/${id}`);
  }

  const cooking = recipePayloadToCooking(payload);
  if (!cooking.steps.length) {
    redirect(`/app/library/${id}`);
  }

  const initialStep = Math.max(0, parseInt(sp.step ?? "0", 10) || 0);
  const initialVoice = sp.voice === "1";

  return (
    <CookPageClient
      recipe={cooking}
      initialStep={initialStep}
      initialVoice={initialVoice}
    />
  );
}
