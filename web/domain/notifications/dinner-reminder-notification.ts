export const DINNER_REMINDER_NOTIFICATION_TITLE = "今晚想吃什麼？";

export function dinnerReminderNotificationOptions(): NotificationOptions {
  return {
    body: "點開職人料理，3 分鐘內想出晚餐",
    tag: "chef-dinner-reminder",
    icon: "/icons/icon-192.png",
    data: { url: "/app" },
  };
}
