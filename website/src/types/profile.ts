/**
 * Profile / application types aligned with backend models
 * (Application.js, Payment.js, statusWorkflow.js). Frontend-only for now.
 */

/** Mirrors backend APPLICATION_STATUSES */
export type ApplicationStatus =
  | "draft"
  | "pending"
  | "documents_required"
  | "sent_to_embassy"
  | "under_embassy_review"
  | "approved"
  | "rejected"
  | "visa_issued"
  | "closed"
  | "archived";

/** Mirrors Application.paymentStatus */
export type ApplicationPaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partial";

/** Mirrors Payment.status */
export type PaymentRecordStatus =
  | "pending"
  | "successful"
  | "failed"
  | "refunded"
  | "cancelled";

/** Mirrors Application.requestedDocuments[].status */
export type RequestedDocumentStatus = "pending" | "uploaded" | "cancelled";

export type ProfileTabId = "personal" | "travel" | "documents" | "payment";

export type TimelineStepState = "completed" | "current" | "pending";

export interface StatusTimelineStep {
  id: string;
  label: string;
  /** Backend statuses that mean this step is reached / completed */
  completedWhen: ApplicationStatus[];
  /** Backend statuses that mean this step is the active one */
  currentWhen: ApplicationStatus[];
}

export interface ProfileNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string | null;
}

export interface ProfileDocument {
  key: string;
  label: string;
  /** Presence of file = uploaded; aligns with ApplicationDocument rows */
  uploaded: boolean;
  fileName: string | null;
  /** Optional requestedDocuments status when admin requested a reupload */
  requestStatus?: RequestedDocumentStatus;
}

export interface ProfilePersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  sex: "male" | "female" | "other" | "";
  nationality: string;
  countryOfResidence: string;
  placeOfBirth: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  maritalStatus: string;
  address: string;
}

export interface ProfileTravelInfo {
  purposeOfTravel: string;
  intendedEntryDate: string;
  intendedExitDate: string;
  stayDurationDays: string;
  addressInAfghanistan: string;
  purposeOfEntry: string;
  transitCountries: string;
}

export interface ProfilePaymentInfo {
  paymentMethod: string;
  paymentStatus: ApplicationPaymentStatus;
  contactEmail: string;
  contactPhone: string;
}

export interface ProfileApplication {
  referenceId: string;
  visaTypeCode: string;
  channel: "evisa" | "embassy";
  status: ApplicationStatus;
  paymentStatus: ApplicationPaymentStatus;
  submittedAt: string | null;
  sentToEmbassyAt: string | null;
  decidedAt: string | null;
  issuedAt: string | null;
  updatedAt: string;
  personal: ProfilePersonalInfo;
  travel: ProfileTravelInfo;
  documents: ProfileDocument[];
  payment: ProfilePaymentInfo;
}

export interface ProfileMockData {
  application: ProfileApplication;
  notifications: ProfileNotification[];
}
