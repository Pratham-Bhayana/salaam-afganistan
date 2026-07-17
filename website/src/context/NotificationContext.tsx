"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchNotifications,
  getWebsiteAccessToken,
  markAllNotificationsRead,
  markNotificationRead,
  type WebsiteNotification,
} from "@/lib/websiteApi";
import {
  requestPushPermissionOnce,
  showBrowserPush,
} from "@/lib/browserPush";
import { playNotificationSound, unlockNotificationAudio } from "@/lib/notificationSound";
import styles from "@/components/NotificationToast.module.css";

type NotificationContextValue = {
  notifications: WebsiteNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_MS = 8_000;
const POLL_HIDDEN_MS = 20_000;
const SEEN_KEY = "salaam_notif_seen_ids";
const BASE_TITLE_KEY = "salaam_base_doc_title";

function notifMessage(n: WebsiteNotification) {
  return n.body || n.message || n.title || "You have a new update on your application.";
}

function notifTitle(n: WebsiteNotification) {
  return n.title || "New notification";
}

function isUnread(n: WebsiteNotification) {
  return n.isRead !== true;
}

function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-80)));
}

function getBaseTitle() {
  if (typeof document === "undefined") return "Salaam Afghanistan";
  const stored = sessionStorage.getItem(BASE_TITLE_KEY);
  if (stored) return stored;
  // Strip any previous (N) prefix we may have set
  const cleaned = document.title.replace(/^\(\d+\+?\)\s+/, "").trim() || "Salaam Afghanistan";
  sessionStorage.setItem(BASE_TITLE_KEY, cleaned);
  return cleaned;
}

function updateTabTitle(unread: number) {
  if (typeof document === "undefined") return;
  const base = getBaseTitle();
  document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<WebsiteNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<WebsiteNotification | null>(null);
  const seenIds = useRef<Set<string>>(loadSeenIds());
  const hideOnProfile = pathname?.startsWith("/profile");
  const routerRef = useRef(router);
  const primedAudio = useRef(false);
  routerRef.current = router;

  const setUnread = useCallback((count: number) => {
    setUnreadCount(count);
    updateTabTitle(count);
  }, []);

  const refresh = useCallback(async () => {
    if (!user || !getWebsiteAccessToken()) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    try {
      const { data, meta } = await fetchNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      const metaObj = meta as { unreadCount?: number } | undefined;
      const unread =
        typeof metaObj?.unreadCount === "number"
          ? metaObj.unreadCount
          : list.filter(isUnread).length;
      setUnread(unread);

      const newestUnread = list.find((n) => isUnread(n) && n._id && !seenIds.current.has(n._id));
      if (newestUnread) {
        seenIds.current.add(newestUnread._id);
        saveSeenIds(seenIds.current);

        playNotificationSound();

        showBrowserPush({
          title: notifTitle(newestUnread),
          body: notifMessage(newestUnread),
          tag: newestUnread._id,
          onClick: () => {
            routerRef.current.push("/profile");
          },
        });

        if (!hideOnProfile) {
          setToast(newestUnread);
        }
      }
    } catch {
      /* offline / unauthenticated — ignore */
    }
  }, [user, hideOnProfile, setUnread]);

  useEffect(() => {
    if (loading || !user) return;
    requestPushPermissionOnce();
  }, [user, loading]);

  // Unlock audio on first interaction so later alerts can play
  useEffect(() => {
    if (!user) return;
    const prime = () => {
      if (primedAudio.current) return;
      primedAudio.current = true;
      unlockNotificationAudio();
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [user]);

  useEffect(() => {
    if (loading) return;
    void refresh();
    if (!user) {
      setUnread(0);
      return;
    }

    let timer: number | undefined;

    const schedule = () => {
      if (timer) window.clearInterval(timer);
      const ms =
        typeof document !== "undefined" && document.visibilityState === "hidden"
          ? POLL_HIDDEN_MS
          : POLL_MS;
      timer = window.setInterval(() => void refresh(), ms);
    };

    schedule();

    const onVisible = () => {
      void refresh();
      schedule();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user, loading, refresh, setUnread]);

  // Keep tab title in sync if route changes document.title
  useEffect(() => {
    updateTabTitle(unreadCount);
  }, [pathname, unreadCount]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic UI so the tab/badge update immediately
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        updateTabTitle(next);
        return next;
      });
      try {
        await markNotificationRead(id);
        await refresh();
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      await refresh();
    }
  }, [refresh, setUnread]);

  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(
    () => ({ notifications, unreadCount, refresh, markRead, markAllRead, dismissToast }),
    [notifications, unreadCount, refresh, markRead, markAllRead, dismissToast],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast && !hideOnProfile ? (
        <div className={styles.toast} role="status" aria-live="polite">
          <div className={styles.toastIcon} aria-hidden>
            <Bell size={18} />
          </div>
          <div className={styles.toastBody}>
            <p className={styles.toastEyebrow}>You have a new notification</p>
            <p className={styles.toastTitle}>{notifTitle(toast)}</p>
            <p className={styles.toastText}>{notifMessage(toast)}</p>
            <button
              type="button"
              className={styles.toastView}
              onClick={() => {
                void markRead(toast._id);
                dismissToast();
                router.push("/profile");
              }}
            >
              View
            </button>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            aria-label="Dismiss"
            onClick={dismissToast}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
