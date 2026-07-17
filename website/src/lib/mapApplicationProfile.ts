import { countrySlugToIso2, iso2ToLabel } from "@/lib/countryCodes";
import type {
  WebsiteApplicationDetail,
  WebsiteNotification,
} from "@/lib/websiteApi";
import type {
  ApplicationPaymentStatus,
  ApplicationStatus,
  ProfileApplication,
  ProfileDocument,
  ProfileNotification,
  ProfilePersonalInfo,
  ProfileTravelInfo,
} from "@/types/profile";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  return { firstName: parts[0] || "", lastName: "" };
}

function asDateString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  try {
    return new Date(value as string).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function countryLabel(code: string | undefined): string {
  if (!code) return "";
  return iso2ToLabel(countrySlugToIso2(code)) || code;
}

export function mapNotification(n: WebsiteNotification): ProfileNotification {
  return {
    id: n._id,
    type: n.type || "update",
    title: n.title || "Update",
    message: n.body || n.message || "",
    read: Boolean(n.isRead),
    createdAt: n.createdAt || null,
  };
}

export function mapApplicationToProfile(app: WebsiteApplicationDetail): ProfileApplication {
  const fullName = app.personal?.fullName || app.passport?.fullName || "";
  const { firstName, lastName } = splitName(fullName);
  const formAnswers = (app.formAnswers || {}) as Record<string, unknown>;

  const personal: ProfilePersonalInfo = {
    firstName,
    lastName,
    email: app.personal?.email || "",
    phone: app.personal?.phone || "",
    dateOfBirth: asDateString(app.personal?.dateOfBirth || app.passport?.dateOfBirth),
    sex: (app.personal?.sex || app.passport?.sex || "") as ProfilePersonalInfo["sex"],
    nationality: countryLabel(app.personal?.nationality || app.passport?.nationality),
    countryOfResidence: countryLabel(app.personal?.countryOfResidence),
    placeOfBirth: String(formAnswers.placeOfBirth || ""),
    passportNumber: app.passport?.passportNumber || "",
    passportIssueDate: asDateString(app.passport?.issueDate),
    passportExpiryDate: asDateString(app.passport?.expiryDate),
    maritalStatus: String(formAnswers.maritalStatus || ""),
    address: String(
      formAnswers.address ||
        formAnswers.homeAddress ||
        formAnswers.residentialAddress ||
        "",
    ),
  };

  const travel: ProfileTravelInfo = {
    purposeOfTravel: app.travel?.purpose || "",
    intendedEntryDate: asDateString(app.travel?.intendedEntryDate),
    intendedExitDate: asDateString(app.travel?.intendedExitDate),
    stayDurationDays: app.travel?.stayDurationDays != null ? String(app.travel.stayDurationDays) : "",
    addressInAfghanistan: app.travel?.addressInAfghanistan || "",
    purposeOfEntry: String(formAnswers.purposeOfEntry || app.travel?.purpose || ""),
    transitCountries: String(formAnswers.transitCountries || ""),
  };

  const uploadedByKey = new Map<string, { fileName: string; label: string }>();
  for (const doc of app.documents || []) {
    uploadedByKey.set(doc.key, {
      fileName: doc.originalName || doc.label || doc.key,
      label: doc.label || doc.key,
    });
  }

  const documents: ProfileDocument[] = [];
  const seen = new Set<string>();

  for (const req of app.updates?.requestedDocuments || app.requestedDocuments || []) {
    seen.add(req.key);
    const uploaded = uploadedByKey.get(req.key);
    documents.push({
      key: req.key,
      label: req.name || req.key,
      uploaded: req.status === "uploaded" || Boolean(uploaded),
      fileName: uploaded?.fileName || null,
      requestStatus: req.status,
    });
  }

  for (const [key, meta] of uploadedByKey) {
    if (seen.has(key)) continue;
    documents.push({
      key,
      label: meta.label,
      uploaded: true,
      fileName: meta.fileName,
    });
  }

  const paymentStatus = (app.paymentStatus || "unpaid") as ApplicationPaymentStatus;
  const latestPayment = app.payments?.[0];

  return {
    referenceId: app.referenceId,
    visaTypeCode: app.visaTypeCode,
    channel: app.channel || "evisa",
    status: app.status as ApplicationStatus,
    paymentStatus,
    submittedAt: app.submittedAt || null,
    sentToEmbassyAt: app.sentToEmbassyAt || null,
    decidedAt: app.decidedAt || null,
    issuedAt: app.issuedAt || null,
    updatedAt: app.updatedAt || new Date().toISOString(),
    personal,
    travel,
    documents,
    payment: {
      paymentMethod: latestPayment?.method || "—",
      paymentStatus,
      contactEmail: personal.email,
      contactPhone: personal.phone,
    },
  };
}
