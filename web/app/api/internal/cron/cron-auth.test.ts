import { describe, expect, it, vi, beforeEach } from "vitest";

describe("cron auth", () => {
  beforeEach(() => {
    vi.stubEnv("NOTIFICATION_CRON_SECRET", "test_secret_cron");
  });

  it("rejects wrong secret", async () => {
    const { POST } = await import("./expiry-reminders/route");
    const res = await POST(
      new Request("http://localhost/api/internal/cron/expiry-reminders", {
        method: "POST",
        headers: { "x-cron-secret": "wrong" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("accepts correct x-cron-secret", async () => {
    vi.mock("@/application/notifications/expiry-reminder-sweep", () => ({
      runExpiryReminderSweep: vi.fn().mockResolvedValue({
        checked: 0,
        sent: 0,
        skipped: {},
      }),
    }));
    const { POST } = await import("./expiry-reminders/route");
    const res = await POST(
      new Request("http://localhost/api/internal/cron/expiry-reminders", {
        method: "POST",
        headers: { "x-cron-secret": "test_secret_cron" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
