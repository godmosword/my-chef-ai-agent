import { runWeeklyDigestSweep } from "@/application/notifications/weekly-digest-sweep";
import { handleCronSweep } from "@/lib/api/cron";

export const maxDuration = 60;

async function handle(request: Request) {
  return handleCronSweep(request, runWeeklyDigestSweep);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
