"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
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
import {
  APPLICATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PROFILE_MOCK,
  STATUS_TIMELINE_STEPS,
  formatDisplayDate,
  getTimelineDetail,
  getTimelineStepState,
} from "@/data/profile";
import type { ProfileTabId } from "@/types/profile";
import { FloatingChat } from "./FloatingChat";
import styles from "./ProfileView.module.css";

const TABS: { id: ProfileTabId; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "travel", label: "Travel Details", icon: Plane },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "payment", label: "Payment Info", icon: Wallet },
];

function splitDisplayName(displayName: string, email: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const local = email.split("@")[0] || "User";
  return { firstName: local, lastName: "" };
}

function formatShortDate(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
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
  const [activeTab, setActiveTab] = useState<ProfileTabId>("personal");
  const [notificationDismissed, setNotificationDismissed] = useState(false);

  const mock = PROFILE_MOCK;
  const app = mock.application;

  const { firstName, lastName } = useMemo(() => {
    if (user?.displayName) return splitDisplayName(user.displayName, user.email);
    return {
      firstName: app.personal.firstName,
      lastName: app.personal.lastName,
    };
  }, [user, app.personal.firstName, app.personal.lastName]);

  const email = user?.email || app.personal.email;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Applicant";

  const statusLabel = APPLICATION_STATUS_LABELS[app.status];
  const hasUnread = mock.notifications.some((n) => !n.read);
  const latestNotification = mock.notifications[0];

  const personal = {
    ...app.personal,
    firstName: firstName || app.personal.firstName,
    lastName: lastName || app.personal.lastName,
    email,
  };

  return (
    <div className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarActions}>
            <Link href="/" className={styles.homeBtn}>
              <Home size={16} aria-hidden />
              <span>Home</span>
            </Link>
          </div>

          {!notificationDismissed ? (
            <aside className={styles.notificationCard} aria-label="Admin notifications">
              <div className={styles.notificationIcon}>
                <Bell size={16} aria-hidden />
                {hasUnread ? <span className={styles.notificationDot} /> : null}
              </div>
              <div className={styles.notificationBody}>
                <p className={styles.notificationTitle}>Admin Notifications</p>
                <p className={styles.notificationText}>
                  {latestNotification?.message ||
                    "No notifications yet. We'll notify you here if we need any additional information."}
                </p>
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

        <div className={styles.topGrid}>
          <section className={styles.profileCard}>
            <div className={styles.avatar} aria-hidden>
              <User size={40} strokeWidth={1.5} />
            </div>
            <h1 className={styles.profileName}>{fullName}</h1>
            <p className={styles.profileEmail}>{email}</p>
            <div className={styles.profileDivider} />
            <p className={styles.appIdLabel}>Application ID</p>
            <p className={styles.appIdValue}>{app.referenceId}</p>
          </section>

          <section className={styles.statusCard} aria-labelledby="status-heading">
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

            <div className={styles.statusBadge}>
              <Clock size={14} aria-hidden />
              <span>{statusLabel}</span>
            </div>
          </section>
        </div>

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
                <InfoField
                  icon={User}
                  label="Gender"
                  value={
                    personal.sex
                      ? personal.sex.charAt(0).toUpperCase() + personal.sex.slice(1)
                      : "—"
                  }
                />
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
                <InfoField icon={User} label="Marital Status" value={personal.maritalStatus} />
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
                  label="Travel Date"
                  value={formatShortDate(app.travel.intendedEntryDate)}
                />
                <InfoField
                  icon={Clock}
                  label="Duration of Stay"
                  value={app.travel.stayDurationDays}
                />
                <InfoField
                  icon={MapPin}
                  label="Place of Entry / Address"
                  value={app.travel.addressInAfghanistan}
                />
                <InfoField
                  icon={Plane}
                  label="Purpose of Entry"
                  value={app.travel.purposeOfEntry}
                />
                <InfoField
                  icon={Globe}
                  label="Transit Countries"
                  value={app.travel.transitCountries}
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
                  You can reupload documents if needed. The new document will replace the old
                  one.
                </p>
              </div>
              <div className={styles.docGrid}>
                {app.documents.map((doc) => (
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
                      {doc.uploaded ? (
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
                    <div className={styles.docActions}>
                      <button
                        type="button"
                        className={styles.docViewBtn}
                        disabled={!doc.uploaded}
                      >
                        <Eye size={14} aria-hidden />
                        View
                      </button>
                      <button type="button" className={styles.docUploadBtn}>
                        <RefreshCw size={14} aria-hidden />
                        {doc.uploaded ? "Reupload" : "Upload"}
                      </button>
                    </div>
                  </article>
                ))}
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

        {app.submittedAt ? (
          <p className={styles.metaNote}>
            Last updated {formatDisplayDate(app.updatedAt)}
          </p>
        ) : null}
      </div>

      <FloatingChat />
    </div>
  );
}
