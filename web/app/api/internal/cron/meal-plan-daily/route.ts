import { runMealPlanDailySweep } from "@/application/notifications/meal-plan-daily-sweep";
import { handleCronSweep } from "@/lib/api/cron";

export const maxDuration = 60;

async function handle(request: Request) {
  return handleCronSweep(request, runMealPlanDailySweep);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
