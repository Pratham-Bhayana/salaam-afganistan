"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchDashboard,
  fetchApplication,
  getWebsiteAccessToken,
  type ApplicationStatus,
  type WebsiteApplicationDetail,
} from "@/lib/websiteApi";
import styles from "./VisaStatusBanner.module.css";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(
  /\/$/,
  "",
);

function isApprovedLike(status: ApplicationStatus | undefined) {
  return status === "approved" || status === "visa_issued";
}

function dismissKey(appId: string, status: string) {
  return `salaam_congrats_dismissed_${appId}_${status}`;
}

/** Homepage-only congratulations popup (not used on profile). */
export function VisaStatusBanner({ variant = "home" }: { variant?: "home" | "profile" }) {
  const { user } = useAuth();
  const [app, setApp] = useState<WebsiteApplicationDetail | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Profile must never show this popup
  const enabled = variant === "home";

  const load = useCallback(async () => {
    if (!enabled || !user || !getWebsiteAccessToken()) {
      setApp(null);
      return;
    }
    try {
      const { data: dash } = await fetchDashboard();
      const latest = dash.applications?.[0];
      if (!latest?._id) {
        setApp(null);
        return;
      }
      const { data } = await fetchApplication(latest._id);
      setApp(data);
      if (data?._id && isApprovedLike(data.status)) {
        const key = dismissKey(data._id, data.status);
        setDismissed(sessionStorage.getItem(key) === "1");
      }
    } catch {
      setApp(null);
    }
  }, [user, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled || !app) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (app._id && app.status) {
          sessionStorage.setItem(dismissKey(app._id, app.status), "1");
        }
        setDismissed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, app]);

  function dismiss() {
    if (app?._id && app.status) {
      sessionStorage.setItem(dismissKey(app._id, app.status), "1");
    }
    setDismissed(true);
  }

  async function downloadVisa() {
    if (!app?._id || !getWebsiteAccessToken()) return;
    setDownloading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/website/applications/${app._id}/visa/download`,
        {
          headers: { Authorization: `Bearer ${getWebsiteAccessToken()}` },
        },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.issuedVisa?.visaNumber || app.referenceId || "visa"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setDownloading(false);
    }
  }

  if (!enabled || !app || dismissed || !isApprovedLike(app.status)) return null;

  const issued = app.status === "visa_issued";

  return (
    <div className={styles.backdrop} role="presentation" onClick={dismiss}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="congrats-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} aria-label="Dismiss" onClick={dismiss}>
          <X size={16} />
        </button>

        <div className={styles.emojiWrap} aria-hidden>
          <span className={styles.emoji}>🎉</span>
          <span className={`${styles.emoji} ${styles.emojiDelayed}`}>✨</span>
        </div>

        <p className={styles.eyebrow}>Congratulations</p>
        <h2 id="congrats-title" className={styles.title}>
          {issued ? "Your visa has been issued" : "Your visa has been approved"}
        </h2>
        <p className={styles.text}>
          Application <strong>{app.referenceId}</strong> is{" "}
          {issued ? "ready to download" : "approved — issuance may follow shortly"}.
        </p>

        <div className={styles.actions}>
          {issued ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => void downloadVisa()}
              disabled={downloading}
            >
              <Download size={16} aria-hidden />
              {downloading ? "Downloading…" : "Download your visa"}
            </button>
          ) : (
            <Link href="/profile" className={styles.primary} onClick={dismiss}>
              <CheckCircle2 size={16} aria-hidden />
              View in profile
            </Link>
          )}
          <Link href="/profile" className={styles.secondary} onClick={dismiss}>
            Open profile
          </Link>
        </div>
      </div>
    </div>
  );
}
