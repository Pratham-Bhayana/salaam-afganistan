const PERMISSION_ASKED_KEY = "salaam_push_permission_asked";

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!canUseBrowserNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    if (typeof window !== "undefined") {
      localStorage.setItem(PERMISSION_ASKED_KEY, "1");
    }
    return result;
  } catch {
    return Notification.permission;
  }
}

/** Ask once after login (non-blocking). */
export function requestPushPermissionOnce() {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== "default") return;
  if (typeof window !== "undefined" && localStorage.getItem(PERMISSION_ASKED_KEY)) return;

  // Defer so it doesn't block first paint / feel spammy mid-click
  window.setTimeout(() => {
    void ensureNotificationPermission();
  }, 1200);
}

export function showBrowserPush(opts: {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}) {
  if (!canUseBrowserNotifications()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag || "salaam-update",
      icon: "/raizing-logo.png",
      badge: "/raizing-logo.png",
      requireInteraction: false,
    });

    n.onclick = () => {
      window.focus();
      opts.onClick?.();
      n.close();
    };

    // Auto-close after a bit when tab is focused
    window.setTimeout(() => n.close(), 12_000);
    return true;
  } catch {
    return false;
  }
}
