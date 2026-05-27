import {
  readDinnerReminder,
  type DinnerReminderSettings,
} from "@/application/notifications/dinner-reminder";
import { capture } from "@/platform/analytics/events";
import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/locale/datetime";

const META_CACHE = "chef-meta-v1";
const META_KEY = "/dinner-reminder-settings";
const NOTIFICATION_TAG = "chef-dinner-reminder";
const PERIODIC_SYNC_TAG = "dinner-reminder";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as { type?: string; channel?: "sw" | "client" };
    if (data?.type === "DINNER_REMINDER_FIRED") {
      capture("dinner_reminder_fired", {
        channel: data.channel ?? "sw",
      });
    }
  });
}

let clientTimeout: ReturnType<typeof setTimeout> | null = null;

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    hour: get("hour"),
    minute: get("minute"),
  };
}

function msUntilNextFire(hour: number, minute: number, timeZone: string): number {
  const now = Date.now();
  let probe = now;
  const maxMs = 48 * 60 * 60 * 1000;
  let scanned = 0;

  while (scanned < maxMs) {
    const p = partsInTimeZone(new Date(probe), timeZone);
    if (p.hour === hour && p.minute === minute) {
      while (probe > now) {
        const prev = partsInTimeZone(new Date(probe - 1000), timeZone);
        if (prev.hour !== hour || prev.minute !== minute) break;
        probe -= 1000;
      }
      return Math.max(1000, probe - now);
    }
    probe += 60_000;
    scanned += 60_000;
  }
  return 24 * 60 * 60 * 1000;
}

async function registerPeriodicSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const periodic = (
      reg as ServiceWorkerRegistration & {
        periodicSync?: {
          register: (tag: string, opts?: { minInterval: number }) => Promise<void>;
          unregister: (tag: string) => Promise<void>;
        };
      }
    ).periodicSync;
    if (periodic) {
      await periodic.register(PERIODIC_SYNC_TAG, {
        minInterval: 60 * 60 * 1000,
      });
    }
  } catch {
    /* periodicSync not supported */
  }
}

async function unregisterPeriodicSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const periodic = (
      reg as ServiceWorkerRegistration & {
        periodicSync?: { unregister: (tag: string) => Promise<void> };
      }
    ).periodicSync;
    if (periodic) {
      await periodic.unregister(PERIODIC_SYNC_TAG);
    }
  } catch {
    /* ignore */
  }
}

async function persistForServiceWorker(settings: DinnerReminderSettings): Promise<void> {
  if (typeof caches === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const cache = await caches.open(META_CACHE);
    await cache.put(
      META_KEY,
      new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "ARM_DINNER_REMINDER", settings });
    if (settings.enabled) {
      await registerPeriodicSync();
    } else {
      await unregisterPeriodicSync();
    }
  } catch {
    /* SW optional */
  }
}

async function showDinnerNotification(): Promise<void> {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;

  const title = "今晚想吃什麼？";
  const options: NotificationOptions = {
    body: "點開職人料理，3 分鐘內想出晚餐",
    tag: NOTIFICATION_TAG,
    icon: "/icons/icon-192.png",
    data: { url: "/app" },
  };

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch {
    /* ignore */
  }
}

function scheduleClientAlarm(settings: DinnerReminderSettings): void {
  if (clientTimeout) {
    clearTimeout(clientTimeout);
    clientTimeout = null;
  }
  if (!settings.enabled) return;
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;

  const delay = msUntilNextFire(
    settings.hour,
    settings.minute,
    DEFAULT_DISPLAY_TIMEZONE,
  );

  clientTimeout = setTimeout(() => {
    void showDinnerNotification().then(() => {
      capture("dinner_reminder_fired", { channel: "client" });
      const next = readDinnerReminder();
      if (next.enabled) scheduleClientAlarm(next);
    });
  }, delay);
}

/** Arm daily dinner reminder (client timer + SW metadata). */
export function armDinnerReminderSchedule(settings?: DinnerReminderSettings): void {
  const s = settings ?? readDinnerReminder();
  void persistForServiceWorker(s);
  scheduleClientAlarm(s);
}

export function disarmDinnerReminderSchedule(): void {
  if (clientTimeout) {
    clearTimeout(clientTimeout);
    clientTimeout = null;
  }
  void persistForServiceWorker({ enabled: false, hour: 17, minute: 30 });
  void unregisterPeriodicSync();
}
