"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotificationsOptional } from "@/context/NotificationContext";
import { ensureNotificationPermission } from "@/lib/browserPush";
import { unlockNotificationAudio } from "@/lib/notificationSound";
import styles from "./HeaderNotifications.module.css";

function isApprovalNotification(n: {
  type?: string;
  title?: string;
  body?: string;
  message?: string;
}) {
  const type = (n.type || "").toLowerCase();
  if (type === "visa_issued" || type === "approved") return true;
  const text = `${n.title || ""} ${n.body || ""} ${n.message || ""}`.toLowerCase();
  return (
    text.includes("approved") ||
    text.includes("visa issued") ||
    text.includes("visa has been issued") ||
    text.includes("is now approved") ||
    text.includes("is now visa_issued")
  );
}

export function HeaderNotifications() {
  const ctx = useNotificationsOptional();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ctx) return null;
  const { notifications, unreadCount, markRead, markAllRead, refresh } = ctx;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => {
          unlockNotificationAudio();
          setOpen((v) => !v);
          if (!open) {
            void ensureNotificationPermission();
            void refresh();
          }
        }}
      >
        <Bell size={16} aria-hidden />
        {unreadCount > 0 ? (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>
            <strong>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</strong>
            <div className={styles.panelActions}>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  className={styles.markAll}
                  onClick={() => void markAllRead()}
                >
                  Mark all read
                </button>
              ) : null}
              <Link href="/profile" className={styles.viewAll} onClick={() => setOpen(false)}>
                View all
              </Link>
            </div>
          </div>
          <ul className={styles.list}>
            {notifications.length === 0 ? (
              <li className={styles.empty}>No notifications yet.</li>
            ) : (
              notifications.slice(0, 8).map((n) => {
                const unread = n.isRead !== true;
                const approval = isApprovalNotification(n);
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      className={`${styles.item} ${unread ? styles.itemUnread : ""} ${
                        approval ? styles.itemApproval : ""
                      }`}
                      onClick={() => {
                        void markRead(n._id);
                        setOpen(false);
                        router.push("/profile");
                      }}
                    >
                      <span className={styles.itemTitle}>
                        {unread ? <span className={styles.dot} aria-hidden /> : null}
                        {approval ? (
                          <span className={styles.approvalEmoji} aria-hidden>
                            🎉
                          </span>
                        ) : null}
                        {n.title || "Update"}
                      </span>
                      <span className={styles.itemBody}>{n.body || n.message || ""}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
