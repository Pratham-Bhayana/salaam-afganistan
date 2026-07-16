"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FileText, LogOut, User } from "lucide-react";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import styles from "./ProfileMenu.module.css";

function getInitials(user: AuthUser): string {
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter((p) => /[a-zA-Z]/.test(p));
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }
  const local = user.email?.split("@")[0] || "U";
  return local.slice(0, 2).toUpperCase();
}

export function ProfileMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const initials = getInitials(user);
  const displayName = user.displayName?.trim() || user.email.split("@")[0] || "Account";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        disabled={loggingOut}
      >
        <span className={styles.triggerAvatar} aria-hidden>
          {initials}
        </span>
      </button>

      {open ? (
        <div className={styles.dropdown} id={menuId} role="menu" aria-label="Account menu">
          <div className={styles.dropdownHeader}>
            <span className={styles.headerAvatar} aria-hidden>
              {initials}
            </span>
            <div className={styles.headerMeta}>
              <p className={styles.headerName}>{displayName}</p>
              <p className={styles.headerEmail}>{user.email}</p>
            </div>
          </div>

          <div className={styles.menuList}>
            <Link
              href="/profile"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => setOpen(false)}
            >
              <User size={16} aria-hidden />
              <span>My Profile</span>
            </Link>
            <Link
              href="/apply"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => setOpen(false)}
            >
              <FileText size={16} aria-hidden />
              <span>My Application</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={16} aria-hidden />
              <span>{loggingOut ? "Logging out…" : "Logout"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
