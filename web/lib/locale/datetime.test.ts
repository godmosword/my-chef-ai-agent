import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_TIMEZONE,
  formatDateSubtitleZh,
  localDateKeyInTimeZone,
  todayDateKeyInTimeZone,
} from "./datetime";

const TZ = DEFAULT_DISPLAY_TIMEZONE;

describe("datetime (Asia/Taipei)", () => {
  it("UTC still May 24 when Taiwan is already May 25 00:30", () => {
    const utc = new Date("2026-05-24T16:30:00.000Z");
    expect(localDateKeyInTimeZone(utc, TZ)).toBe("2026-05-25");
    expect(formatDateSubtitleZh(utc, TZ)).toContain("5月25日");
    expect(formatDateSubtitleZh(utc, TZ)).toContain("星期一");
  });

  it("Taiwan 00:30 shows correct calendar day", () => {
    const utc = new Date("2026-05-24T16:30:00.000Z");
    expect(localDateKeyInTimeZone(utc, TZ)).toBe("2026-05-25");
  });

  it("Taiwan 23:30 still same calendar day", () => {
    const utc = new Date("2026-05-25T15:30:00.000Z");
    expect(localDateKeyInTimeZone(utc, TZ)).toBe("2026-05-25");
    expect(formatDateSubtitleZh(utc, TZ)).toContain("星期一");
  });

  it("todayDateKey matches localDateKey for now", () => {
    const now = new Date();
    expect(todayDateKeyInTimeZone(TZ)).toBe(localDateKeyInTimeZone(now, TZ));
  });
});
