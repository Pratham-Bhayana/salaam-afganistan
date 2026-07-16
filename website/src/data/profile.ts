import type {
  ApplicationPaymentStatus,
  ApplicationStatus,
  ProfileMockData,
  StatusTimelineStep,
} from "@/types/profile";

/** Mirrors backend `APPLICATION_STATUSES` in statusWorkflow.js */
export const APPLICATION_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  DOCUMENTS_REQUIRED: "documents_required",
  SENT_TO_EMBASSY: "sent_to_embassy",
  UNDER_EMBASSY_REVIEW: "under_embassy_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  VISA_ISSUED: "visa_issued",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const satisfies Record<string, ApplicationStatus>;

/** Mirrors Application.paymentStatus enum */
export const APPLICATION_PAYMENT_STATUSES = {
  UNPAID: "unpaid",
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIAL: "partial",
} as const satisfies Record<string, ApplicationPaymentStatus>;

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  pending: "Under Review",
  documents_required: "Documents Required",
  sent_to_embassy: "Sent to Embassy",
  under_embassy_review: "Under Embassy Review",
  approved: "Approved",
  rejected: "Rejected",
  visa_issued: "Visa Issued",
  closed: "Closed",
  archived: "Archived",
};

export const PAYMENT_STATUS_LABELS: Record<ApplicationPaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Completed",
  failed: "Failed",
  refunded: "Refunded",
  partial: "Partial",
};

/**
 * Four-step status timeline (UI). Each step maps to backend Application.status values
 * so the UI can consume live API data without restructuring later.
 */
export const STATUS_TIMELINE_STEPS: StatusTimelineStep[] = [
  {
    id: "submitted",
    label: "Application Submitted",
    completedWhen: [
      "pending",
      "documents_required",
      "sent_to_embassy",
      "under_embassy_review",
      "approved",
      "rejected",
      "visa_issued",
      "closed",
      "archived",
    ],
    currentWhen: [],
  },
  {
    id: "under_review",
    label: "Under Review by Salaam Afghanistan",
    completedWhen: [
      "sent_to_embassy",
      "under_embassy_review",
      "approved",
      "rejected",
      "visa_issued",
      "closed",
      "archived",
    ],
    currentWhen: ["pending", "documents_required"],
  },
  {
    id: "embassy",
    label: "Sent to Embassy",
    completedWhen: [
      "approved",
      "rejected",
      "visa_issued",
      "closed",
      "archived",
    ],
    currentWhen: ["sent_to_embassy", "under_embassy_review"],
  },
  {
    id: "decision",
    label: "Final Decision",
    completedWhen: ["visa_issued", "closed", "archived"],
    currentWhen: ["approved", "rejected"],
  },
];

export function getTimelineStepState(
  step: StatusTimelineStep,
  status: ApplicationStatus,
): "completed" | "current" | "pending" {
  if (status === "draft") return "pending";
  if (step.completedWhen.includes(status)) return "completed";
  if (step.currentWhen.includes(status)) return "current";
  if (step.id === "submitted") return "completed";
  return "pending";
}

export function getTimelineDetail(
  stepId: string,
  status: ApplicationStatus,
  dates: {
    submittedAt: string | null;
    sentToEmbassyAt: string | null;
    decidedAt: string | null;
    issuedAt: string | null;
  },
): string {
  const state = getTimelineStepState(
    STATUS_TIMELINE_STEPS.find((s) => s.id === stepId)!,
    status,
  );

  if (stepId === "submitted") {
    if (dates.submittedAt) {
      return formatDisplayDate(dates.submittedAt);
    }
    return state === "pending" ? "Pending" : "Submitted";
  }

  if (stepId === "under_review") {
    if (status === "documents_required") return "Documents required";
    if (state === "current") return "In Progress";
    if (state === "completed") return "Completed";
    return "Pending";
  }

  if (stepId === "embassy") {
    if (status === "under_embassy_review") return "Under Embassy Review";
    if (state === "current") {
      return dates.sentToEmbassyAt
        ? formatDisplayDate(dates.sentToEmbassyAt)
        : "In Progress";
    }
    if (state === "completed") return "Completed";
    return "Pending";
  }

  // decision
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "visa_issued") {
    return dates.issuedAt ? `Issued ${formatDisplayDate(dates.issuedAt)}` : "Visa Issued";
  }
  if (state === "completed") return "Completed";
  return "Pending";
}

export function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Placeholder application shaped like GET /applications/:id (+ applicant fields).
 * Replace with API data when backend is wired; do not invent alternate status strings.
 */
export const PROFILE_MOCK: ProfileMockData = {
  application: {
    referenceId: "SA-2025-0036",
    visaTypeCode: "embassy_tourist",
    channel: "embassy",
    status: "pending",
    paymentStatus: "paid",
    submittedAt: "2025-12-20T10:00:00.000Z",
    sentToEmbassyAt: null,
    decidedAt: null,
    issuedAt: null,
    updatedAt: "2025-12-20T10:00:00.000Z",
    personal: {
      firstName: "Pratham",
      lastName: "Bhayana",
      email: "prathambhayana868@gmail.com",
      phone: "+91 98765 43210",
      dateOfBirth: "1998-05-14",
      sex: "male",
      nationality: "Indian",
      countryOfResidence: "India",
      placeOfBirth: "Delhi, India",
      passportNumber: "Z1234567",
      passportIssueDate: "2020-03-15",
      passportExpiryDate: "2030-03-14",
      maritalStatus: "Single",
      address: "12 Park Street, New Delhi, India 110001",
    },
    travel: {
      purposeOfTravel: "Tourism and cultural visit",
      intendedEntryDate: "2026-05-01",
      intendedExitDate: "2026-05-26",
      stayDurationDays: "25",
      addressInAfghanistan: "Kabul Serena Hotel, Kabul",
      purposeOfEntry: "Tourism",
      transitCountries: "None",
    },
    documents: [
      { key: "passport_bio_page", label: "Passport Bio Page", uploaded: true, fileName: "passport-front.pdf" },
      { key: "passport_photo", label: "Passport Photo", uploaded: true, fileName: "photo.jpg" },
      { key: "invitation_letter", label: "Request Letter", uploaded: true, fileName: "request-letter.pdf" },
      { key: "hotel_booking", label: "Accommodation Proof", uploaded: true, fileName: "hotel.pdf" },
      { key: "flight_tickets", label: "Travel Ticket", uploaded: true, fileName: "tickets.pdf" },
      { key: "travel_insurance", label: "Insurance Copy", uploaded: true, fileName: "insurance.pdf" },
      { key: "bank_statement", label: "Financial Proof", uploaded: false, fileName: null },
    ],
    payment: {
      paymentMethod: "credit",
      paymentStatus: "paid",
      contactEmail: "N/A",
      contactPhone: "N/A",
    },
  },
  notifications: [],
};
