"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Globe,
  Home,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Plane,
  RefreshCw,
  Upload,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  APPLICATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_TIMELINE_STEPS,
  formatDisplayDate,
  getTimelineDetail,
  getTimelineStepState,
} from "@/data/profile";
import {
  fetchApplication,
  fetchDashboard,
  getWebsiteAccessToken,
  uploadApplicationDocument,
  WebsiteApiError,
  type WebsiteApplicationDetail,
} from "@/lib/websiteApi";
import { mapApplicationToProfile, mapNotification } from "@/lib/mapApplicationProfile";
import type { ProfileApplication, ProfileTabId } from "@/types/profile";
import { FloatingChat } from "./FloatingChat";
import styles from "./ProfileView.module.css";

const TABS: { id: ProfileTabId; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "travel", label: "Travel Details", icon: Plane },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payment", label: "Payment Info", icon: Wallet },
];

function formatShortDate(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function statusBorderClass(status: string): string {
  if (status === "pending") return styles.statusBorderPending;
  if (status === "documents_required") return styles.statusBorderDocs;
  if (status === "sent_to_embassy" || status === "under_embassy_review") {
    return styles.statusBorderEmbassy;
  }
  if (status === "rejected") return styles.statusBorderRejected;
  if (status === "approved" || status === "visa_issued") {
    return styles.statusBorderApproved;
  }
  return "";
}

function InfoField({
  icon: Icon,
  label,
  value,
  fullWidth,
}: {
  icon: typeof User;
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${styles.infoField} ${fullWidth ? styles.infoFieldFull : ""}`}>
      <div className={styles.infoLabelRow}>
        <Icon size={14} aria-hidden className={styles.infoIcon} />
        <span className={styles.infoLabel}>{label}</span>
      </div>
      <p className={styles.infoValue}>{value || "—"}</p>
    </div>
  );
}

export function ProfileView() {
  const { user } = useAuth();
  const { notifications, unreadCount, refresh: refreshNotifs, markRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [rawApp, setRawApp] = useState<WebsiteApplicationDetail | null>(null);
  const [app, setApp] = useState<ProfileApplication | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [downloadingVisa, setDownloadingVisa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !getWebsiteAccessToken()) {
      setLoading(false);
      setError("Please sign in to view your application.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: dash } = await fetchDashboard();
      const latest = dash.applications?.[0];
      if (!latest?._id) {
        setApplicationId(null);
        setRawApp(null);
        setApp(null);
        setError("");
        return;
      }
      setApplicationId(latest._id);
      const { data: detail } = await fetchApplication(latest._id);
      setRawApp(detail);
      setApp(mapApplicationToProfile(detail));
      void refreshNotifs();
    } catch (err) {
      setError(
        err instanceof WebsiteApiError
          ? err.message
          : "Could not load your application. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, refreshNotifs]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const profileNotifications = useMemo(
    () => notifications.map(mapNotification),
    [notifications],
  );
  const latestNotification = profileNotifications[0];
  const hasUnread = unreadCount > 0 || profileNotifications.some((n) => !n.read);

  const chatMessages = useMemo(() => {
    const fromNotifs = [...profileNotifications]
      .reverse()
      .map((n) => ({
        id: n.id,
        role: "support" as const,
        text: n.message || n.title,
      }));
    const fromActivity = (rawApp?.activity || [])
      .filter((a) => a.note && (a.action === "status_changed" || a.action === "note" || a.note))
      .slice(-8)
      .map((a, i) => ({
        id: `act-${i}-${a.at}`,
        role: "support" as const,
        text: a.note || a.action,
      }));
    const merged = [...fromActivity, ...fromNotifs];
    if (!merged.length) {
      return [
        {
          id: "welcome",
          role: "support" as const,
          text: "Hello! Updates from our team about your application will appear here.",
        },
      ];
    }
    return merged.slice(-20);
  }, [profileNotifications, rawApp?.activity]);

  async function handleUploadFile(file: File, key: string, label: string) {
    if (!applicationId) return;
    setUploadingKey(key);
    setUploadError("");
    try {
      await uploadApplicationDocument(applicationId, file, key, label);
      await load();
      if (activeTab !== "documents") setActiveTab("documents");
    } catch (err) {
      setUploadError(
        err instanceof WebsiteApiError ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploadingKey(null);
      pendingUploadKey.current = null;
    }
  }

  function triggerUpload(key: string) {
    pendingUploadKey.current = key;
    fileInputRef.current?.click();
  }

  async function downloadVisa() {
    if (!applicationId || !getWebsiteAccessToken()) return;
    setDownloadingVisa(true);
    setUploadError("");
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(
        /\/$/,
        "",
      );
      const res = await fetch(`${apiBase}/api/v1/website/applications/${applicationId}/visa/download`, {
        headers: { Authorization: `Bearer ${getWebsiteAccessToken()}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rawApp?.issuedVisa?.visaNumber || app?.applicationId || "visa"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setUploadError("Could not download your visa. Please try again.");
    } finally {
      setDownloadingVisa(false);
    }
  }

  if (loading && !app) {
    return (
      <div className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <p className={styles.metaNote}>Loading your application…</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.toolbar}>
            <Link href="/" className={styles.homeBtn}>
              <Home size={16} aria-hidden />
              <span>Home</span>
            </Link>
          </div>
          <section className={styles.contentCard}>
            <h2 className={styles.contentTitle}>No application yet</h2>
            <p className={styles.metaNote}>
              {error || "Start an application to track status, documents, and messages here."}
            </p>
            <Link href="/apply" className={styles.homeBtn} style={{ marginTop: "1rem" }}>
              Apply now
            </Link>
          </section>
        </div>
        <FloatingChat messages={chatMessages} />
      </div>
    );
  }

  const personal = app.personal;
  const fullName =
    [personal.firstName, personal.lastName].filter(Boolean).join(" ") ||
    user?.displayName ||
    "Applicant";
  const email = personal.email || user?.email || "";
  const statusLabel = APPLICATION_STATUS_LABELS[app.status] || app.status;
  const pendingRequests = (rawApp?.updates?.requestedDocuments || rawApp?.requestedDocuments || []).filter(
    (d) => d.status === "pending",
  );
  const documentRequestNote =
    rawApp?.updates?.documentRequestNote || rawApp?.documentRequestNote || "";

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf"
          className={styles.hiddenFile}
          onChange={(e) => {
            const file = e.target.files?.[0];
            const key = pendingUploadKey.current;
            e.target.value = "";
            if (!file || !key) return;
            const label =
              app.documents.find((d) => d.key === key)?.label ||
              pendingRequests.find((d) => d.key === key)?.name ||
              key;
            void handleUploadFile(file, key, label);
          }}
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarActions}>
            <Link href="/" className={styles.homeBtn}>
              <Home size={16} aria-hidden />
              <span>Home</span>
            </Link>
            <button type="button" className={styles.homeBtn} onClick={() => void load()}>
              <RefreshCw size={16} aria-hidden />
              <span>Refresh</span>
            </button>
          </div>

          {!notificationDismissed ? (
            <aside className={styles.notificationCard} aria-label="Admin notifications">
              <div className={styles.notificationIcon}>
                <Bell size={16} aria-hidden />
                {hasUnread ? <span className={styles.notificationDot} /> : null}
              </div>
              <div className={styles.notificationBody}>
                <p className={styles.notificationTitle}>
                  Notifications{unreadCount ? ` (${unreadCount})` : ""}
                </p>
                <p className={styles.notificationText}>
                  {latestNotification?.message ||
                    "No notifications yet. We'll notify you here if we need any additional information."}
                </p>
                {profileNotifications.length > 1 ? (
                  <ul className={styles.notificationList}>
                    {profileNotifications.slice(0, 5).map((n) => {
                      const approval =
                        /approved|visa issued|🎉/i.test(`${n.title} ${n.message}`);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={`${styles.notificationItem} ${
                              approval ? styles.notificationItemApproval : ""
                            }`}
                            onClick={() => void markRead(n.id)}
                          >
                            <strong>
                              {approval && !n.title.includes("🎉") ? "🎉 " : ""}
                              {n.title}
                            </strong>
                            <span>{n.message}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <button
                type="button"
                className={styles.notificationClose}
                aria-label="Dismiss notifications"
                onClick={() => setNotificationDismissed(true)}
              >
                <X size={14} />
              </button>
            </aside>
          ) : null}
        </div>

        {error ? <p className={styles.loadError}>{error}</p> : null}

        <div className={styles.topGrid}>
          <section className={`${styles.profileCard} ${statusBorderClass(app.status)}`}>
            <div className={styles.avatar} aria-hidden>
              <User size={40} strokeWidth={1.5} />
            </div>
            <h1 className={styles.profileName}>{fullName}</h1>
            <p className={styles.profileEmail}>{email}</p>
            <div className={styles.profileDivider} />
            <p className={styles.appIdLabel}>Application ID</p>
            <p className={styles.appIdValue}>{app.referenceId}</p>
          </section>

          <section
            className={`${styles.statusCard} ${statusBorderClass(app.status)}`}
            aria-labelledby="status-heading"
          >
            <div className={styles.statusHeader}>
              <FileText size={18} aria-hidden />
              <h2 id="status-heading" className={styles.statusTitle}>
                Application Status
              </h2>
            </div>

            <ol className={styles.timeline}>
              {STATUS_TIMELINE_STEPS.map((step, index) => {
                const state = getTimelineStepState(step, app.status);
                const detail = getTimelineDetail(step.id, app.status, {
                  submittedAt: app.submittedAt,
                  sentToEmbassyAt: app.sentToEmbassyAt,
                  decidedAt: app.decidedAt,
                  issuedAt: app.issuedAt,
                });
                const stateClass =
                  state === "completed"
                    ? styles.timelineCompleted
                    : state === "current"
                      ? styles.timelineCurrent
                      : styles.timelinePending;

                return (
                  <li key={step.id} className={`${styles.timelineItem} ${stateClass}`}>
                    <div className={styles.timelineTrack}>
                      <span className={styles.timelineDot} aria-hidden />
                      {index < STATUS_TIMELINE_STEPS.length - 1 ? (
                        <span className={styles.timelineLine} aria-hidden />
                      ) : null}
                    </div>
                    <div className={styles.timelineContent}>
                      <p className={styles.timelineLabel}>{step.label}</p>
                      <p className={styles.timelineDetail}>{detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className={styles.statusActions}>
              <div className={styles.statusBadge}>
                <Clock size={14} aria-hidden />
                <span>{statusLabel}</span>
              </div>
              {app.status === "visa_issued" ? (
                <button
                  type="button"
                  className={styles.downloadVisaBtn}
                  onClick={() => void downloadVisa()}
                  disabled={downloadingVisa}
                >
                  <Download size={14} aria-hidden />
                  {downloadingVisa ? "Downloading…" : "Download Visa"}
                </button>
              ) : null}
            </div>
          </section>
        </div>

        {pendingRequests.length > 0 ? (
          <section className={styles.requestBanner} aria-label="Documents requested">
            <div className={styles.requestBannerHead}>
              <Upload size={18} aria-hidden />
              <div>
                <h2>Documents requested</h2>
                <p>
                  {documentRequestNote ||
                    "Our team needs additional documents. Upload them below to continue processing."}
                </p>
              </div>
            </div>
            <ul className={styles.requestList}>
              {pendingRequests.map((doc) => (
                <li key={doc.key}>
                  <span>{doc.name}</span>
                  <button
                    type="button"
                    className={styles.docUploadBtn}
                    disabled={uploadingKey === doc.key}
                    onClick={() => triggerUpload(doc.key)}
                  >
                    <Upload size={14} aria-hidden />
                    {uploadingKey === doc.key ? "Uploading…" : "Upload"}
                  </button>
                </li>
              ))}
            </ul>
            {uploadError ? <p className={styles.loadError}>{uploadError}</p> : null}
          </section>
        ) : null}

        <nav className={styles.tabs} aria-label="Profile sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} aria-hidden />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <section className={styles.contentCard}>
          {activeTab === "personal" ? (
            <>
              <h2 className={styles.contentTitle}>Personal Information</h2>
              <div className={styles.infoGrid}>
                <InfoField icon={User} label="First Name" value={personal.firstName} />
                <InfoField icon={User} label="Last Name" value={personal.lastName} />
                <InfoField icon={IdCard} label="Passport Number" value={personal.passportNumber} />
                <InfoField
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatShortDate(personal.dateOfBirth)}
                />
                <InfoField icon={Globe} label="Nationality" value={personal.nationality} />
                <InfoField icon={MapPin} label="Country of Residence" value={personal.countryOfResidence} />
                <InfoField
                  icon={User}
                  label="Gender"
                  value={
                    personal.sex
                      ? personal.sex.charAt(0).toUpperCase() + personal.sex.slice(1)
                      : "—"
                  }
                />
                <InfoField icon={Mail} label="Email" value={personal.email} />
                <InfoField icon={Phone} label="Phone" value={personal.phone} />
                <InfoField icon={MapPin} label="Place of Birth" value={personal.placeOfBirth} />
                <InfoField
                  icon={Calendar}
                  label="Passport Issue Date"
                  value={formatShortDate(personal.passportIssueDate)}
                />
                <InfoField
                  icon={Calendar}
                  label="Passport Expiry Date"
                  value={formatShortDate(personal.passportExpiryDate)}
                />
                <InfoField
                  icon={MapPin}
                  label="Address"
                  value={personal.address}
                  fullWidth
                />
              </div>
            </>
          ) : null}

          {activeTab === "travel" ? (
            <>
              <h2 className={styles.contentTitle}>Travel Details</h2>
              <div className={styles.infoGrid}>
                <InfoField
                  icon={Briefcase}
                  label="Purpose of Visit"
                  value={app.travel.purposeOfTravel}
                />
                <InfoField
                  icon={Calendar}
                  label="Entry Date"
                  value={formatShortDate(app.travel.intendedEntryDate)}
                />
                <InfoField
                  icon={Calendar}
                  label="Exit Date"
                  value={formatShortDate(app.travel.intendedExitDate)}
                />
                <InfoField
                  icon={Clock}
                  label="Duration of Stay"
                  value={app.travel.stayDurationDays}
                />
                <InfoField
                  icon={MapPin}
                  label="Address in Afghanistan"
                  value={app.travel.addressInAfghanistan}
                  fullWidth
                />
              </div>
            </>
          ) : null}

          {activeTab === "documents" ? (
            <>
              <h2 className={styles.contentTitle}>Uploaded Documents</h2>
              <div className={styles.docBanner}>
                <FileText size={16} aria-hidden />
                <p>
                  Upload or re-upload documents when requested. New files are saved to your
                  application immediately.
                </p>
              </div>
              {uploadError ? <p className={styles.loadError}>{uploadError}</p> : null}
              <div className={styles.docGrid}>
                {app.documents.length === 0 ? (
                  <p className={styles.metaNote}>No documents uploaded yet.</p>
                ) : (
                  app.documents.map((doc) => (
                    <article key={doc.key} className={styles.docCard}>
                      <div className={styles.docIcon} aria-hidden>
                        <FileText size={18} />
                      </div>
                      <h3 className={styles.docTitle}>{doc.label}</h3>
                      <p
                        className={`${styles.docStatus} ${
                          doc.uploaded ? styles.docUploaded : styles.docMissing
                        }`}
                      >
                        {doc.requestStatus === "pending" ? (
                          <>
                            <Upload size={14} aria-hidden />
                            Requested
                          </>
                        ) : doc.uploaded ? (
                          <>
                            <CheckCircle2 size={14} aria-hidden />
                            Uploaded
                          </>
                        ) : (
                          <>
                            <Upload size={14} aria-hidden />
                            Not uploaded
                          </>
                        )}
                      </p>
                      {doc.fileName ? (
                        <p className={styles.docFileName}>{doc.fileName}</p>
                      ) : null}
                      <div className={styles.docActions}>
                        <button
                          type="button"
                          className={styles.docUploadBtn}
                          disabled={uploadingKey === doc.key}
                          onClick={() => triggerUpload(doc.key)}
                        >
                          <RefreshCw size={14} aria-hidden />
                          {uploadingKey === doc.key
                            ? "Uploading…"
                            : doc.uploaded
                              ? "Reupload"
                              : "Upload"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : null}

          {activeTab === "payment" ? (
            <>
              <h2 className={styles.contentTitle}>Payment Information</h2>
              <div className={styles.paymentGrid}>
                <div className={styles.paymentTile}>
                  <div className={styles.infoLabelRow}>
                    <Wallet size={14} aria-hidden className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Payment Method</span>
                  </div>
                  <p className={styles.infoValue}>{app.payment.paymentMethod}</p>
                </div>
                <div className={styles.paymentTile}>
                  <div className={styles.infoLabelRow}>
                    <CreditCard size={14} aria-hidden className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Payment Status</span>
                  </div>
                  <span className={styles.paymentStatusBadge}>
                    {PAYMENT_STATUS_LABELS[app.payment.paymentStatus]}
                  </span>
                </div>
                <div className={styles.paymentTile}>
                  <div className={styles.infoLabelRow}>
                    <Mail size={14} aria-hidden className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Contact Email</span>
                  </div>
                  <p className={styles.infoValue}>{app.payment.contactEmail}</p>
                </div>
                <div className={styles.paymentTile}>
                  <div className={styles.infoLabelRow}>
                    <Phone size={14} aria-hidden className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Contact Phone</span>
                  </div>
                  <p className={styles.infoValue}>{app.payment.contactPhone}</p>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <p className={styles.metaNote}>
          Last updated {formatDisplayDate(app.updatedAt)}
          {loading ? " · Refreshing…" : ""}
        </p>
      </div>

      <FloatingChat messages={chatMessages} />
    </div>
  );
}
