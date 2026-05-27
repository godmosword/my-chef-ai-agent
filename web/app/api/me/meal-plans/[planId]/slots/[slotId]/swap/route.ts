import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeSlotForClient } from "@/application/meal-planning/meal-plan-ui";
import {
  applySwap,
  suggestSwapCandidates,
  type SwapMode,
} from "@/application/meal-planning/meal-planner-swap";
import {
  planForbidden,
  requireMealPlansApi,
} from "@/application/meal-planning/meal-plans-api";
import { getMealSlot } from "@/platform/db/meal-planning";

type Params = { params: Promise<{ planId: string; slotId: string }> };

const bodySchema = z.object({
  mode: z.enum(["similar", "different", "specific"]),
  user_request: z.string().optional(),
  candidate_index: z.number().int().min(0).optional(),
  candidate: z
    .object({
      dish_title: z.string(),
      cuisine: z.string().nullable().optional(),
      estimated_time_min: z.number().nullable().optional(),
      key_ingredients: z.array(z.unknown()).optional(),
      estimated_cost: z.number().nullable().optional(),
      rationale: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireMealPlansApi();
  if (!auth.ok) return auth.response;

  const { planId, slotId } = await params;
  const pid = parseInt(planId, 10);
  const sid = parseInt(slotId, 10);
  const existing = await getMealSlot(sid, auth.tenantId, auth.userId);
  if (!existing || existing.meal_plan_id !== pid) return planForbidden();

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const mode = body.mode as SwapMode;

  if (body.candidate) {
    const slot = await applySwap(
      sid,
      auth.tenantId,
      auth.userId,
      {
        dish_title: body.candidate.dish_title,
        cuisine: body.candidate.cuisine ?? null,
        estimated_time_min: body.candidate.estimated_time_min ?? null,
        effort_level: null,
        key_ingredients: (body.candidate.key_ingredients ?? []) as never,
        estimated_cost: body.candidate.estimated_cost ?? null,
        rationale: body.candidate.rationale ?? null,
      },
      mode,
    );
    if (!slot) return planForbidden();
    return NextResponse.json({
      ok: true,
      applied: true,
      slot: serializeSlotForClient(slot),
    });
  }

  const candidates = await suggestSwapCandidates(
    sid,
    auth.tenantId,
    auth.userId,
    mode,
    body.user_request,
  );

  if (body.candidate_index != null && candidates[body.candidate_index]) {
    const slot = await applySwap(
      sid,
      auth.tenantId,
      auth.userId,
      candidates[body.candidate_index]!,
      mode,
    );
    if (!slot) return planForbidden();
    return NextResponse.json({
      ok: true,
      applied: true,
      slot: serializeSlotForClient(slot),
    });
  }

  return NextResponse.json({
    ok: true,
    applied: false,
    candidates,
  });
}
