const STORAGE_KEY = "chef_dinner_reminder";

export type DinnerReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT: DinnerReminderSettings = {
  enabled: false,
  hour: 17,
  minute: 30,
};

export function readDinnerReminder(): DinnerReminderSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) } as DinnerReminderSettings;
  } catch {
    return DEFAULT;
  }
}

export function writeDinnerReminder(settings: DinnerReminderSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}
