import { countrySlugToIso2 } from "@/lib/countryCodes";
import type { CreateApplicationPayload } from "@/lib/websiteApi";

type Values = Record<string, string | boolean>;

const PERSONAL_KEYS = new Set([
  "fullName",
  "email",
  "phone",
  "dateOfBirth",
  "sex",
  "nationality",
  "countryOfResidence",
]);

const PASSPORT_KEYS = new Set([
  "passportNumber",
  "passportIssuingCountry",
  "passportIssueDate",
  "passportExpiryDate",
  "placeOfBirth",
]);

const TRAVEL_KEYS = new Set([
  "purposeOfTravel",
  "intendedEntryDate",
  "intendedExitDate",
  "stayDurationDays",
  "addressInAfghanistan",
  "citiesToVisit",
  "processingSpeed",
]);

const SKIP_KEYS = new Set([
  "digitalSignature",
  "isMinor",
  "isNonCitizenResident",
]);

function str(v: string | boolean | undefined): string {
  if (typeof v === "string") return v.trim();
  return "";
}

function num(v: string | boolean | undefined): number | undefined {
  const n = Number(str(v));
  return Number.isFinite(n) ? n : undefined;
}

/** Map ApplyFlow form values → backend create/update payload. */
export function buildApplicationPayload(
  visaTypeCode: string,
  values: Values,
): CreateApplicationPayload {
  const nationality = countrySlugToIso2(str(values.nationality));
  const countryOfResidence = countrySlugToIso2(str(values.countryOfResidence));
  const issuingCountry = countrySlugToIso2(str(values.passportIssuingCountry)) || nationality;

  const personal = {
    fullName: str(values.fullName),
    email: str(values.email),
    phone: str(values.phone),
    dateOfBirth: str(values.dateOfBirth) || undefined,
    sex: str(values.sex) || undefined,
    nationality: nationality || undefined,
    countryOfResidence: countryOfResidence || undefined,
  };

  const passport = {
    fullName: str(values.fullName) || undefined,
    passportNumber: str(values.passportNumber) || undefined,
    nationality: nationality || undefined,
    dateOfBirth: str(values.dateOfBirth) || undefined,
    sex: str(values.sex) || undefined,
    issueDate: str(values.passportIssueDate) || undefined,
    expiryDate: str(values.passportExpiryDate) || undefined,
    issuingCountry: issuingCountry || undefined,
  };

  const travel = {
    purpose: str(values.purposeOfTravel) || undefined,
    intendedEntryDate: str(values.intendedEntryDate) || undefined,
    intendedExitDate: str(values.intendedExitDate) || undefined,
    stayDurationDays: num(values.stayDurationDays),
    addressInAfghanistan: str(values.addressInAfghanistan) || undefined,
    citiesToVisit: str(values.citiesToVisit) || undefined,
    processingSpeed: (str(values.processingSpeed) as "standard" | "express" | "flat") || "standard",
  };

  const formAnswers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (PERSONAL_KEYS.has(key) || PASSPORT_KEYS.has(key) || TRAVEL_KEYS.has(key) || SKIP_KEYS.has(key)) {
      continue;
    }
    formAnswers[key] = value;
  }
  formAnswers.isMinor = Boolean(values.isMinor);
  formAnswers.isNonCitizenResident = Boolean(values.isNonCitizenResident);
  if (str(values.placeOfBirth)) formAnswers.placeOfBirth = str(values.placeOfBirth);
  if (str(values.address)) formAnswers.address = str(values.address);

  return {
    visaTypeCode,
    personal,
    passport,
    travel,
    formAnswers,
  };
}
