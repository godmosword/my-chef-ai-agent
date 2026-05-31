import {
  readDinnerReminder,
  type DinnerReminderSettings,
} from "@/application/notifications/dinner-reminder";
import { capture } from "@/platform/analytics/events";
import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/locale/datetime";
import {
  DINNER_REMINDER_NOTIFICATION_TITLE,
  dinnerReminderNotificationOptions,
} from "@/domain/notifications/dinner-reminder-notification";
import { dinnerReminderPartsInTimeZone } from "@/domain/notifications/dinner-reminder-time";

const META_CACHE = "chef-meta-v1";
const META_KEY = "/dinner-reminder-settings";
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

function msUntilNextFire(hour: number, minute: number, timeZone: string): number {
  const now = Date.now();
  let probe = now;
  const maxMs = 48 * 60 * 60 * 1000;
  let scanned = 0;

  while (scanned < maxMs) {
    const p = dinnerReminderPartsInTimeZone(new Date(probe), timeZone);
    if (p.hour === hour && p.minute === minute) {
      while (probe > now) {
        const prev = dinnerReminderPartsInTimeZone(
          new Date(probe - 1000),
          timeZone,
        );
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

  const title = DINNER_REMINDER_NOTIFICATION_TITLE;
  const options = dinnerReminderNotificationOptions();

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
    void showDinnerNotification()
      .then(() => {
        capture("dinner_reminder_fired", { channel: "client" });
        const next = readDinnerReminder();
        if (next.enabled) scheduleClientAlarm(next);
      })
      .catch(() => {});
  }, delay);
}

/** Arm daily dinner reminder (client timer + SW metadata). */
export function armDinnerReminderSchedule(settings?: DinnerReminderSettings): void {
  const s = settings ?? readDinnerReminder();
  void persistForServiceWorker(s).catch(() => {});
  scheduleClientAlarm(s);
}

export function disarmDinnerReminderSchedule(): void {
  if (clientTimeout) {
    clearTimeout(clientTimeout);
    clientTimeout = null;
  }
  void persistForServiceWorker({ enabled: false, hour: 17, minute: 30 }).catch(
    () => {},
  );
  void unregisterPeriodicSync().catch(() => {});
}
