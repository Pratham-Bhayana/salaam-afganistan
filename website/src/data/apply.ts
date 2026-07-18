import type {
  ApplyStepMeta,
  DocumentItem,
  FormFieldDef,
  VisaTypeOption,
} from "@/types/apply";

/** Application wizard steps */
export const APPLY_STEPS: ApplyStepMeta[] = [
  { id: "visa-type", number: 1, label: "Visa Type" },
  { id: "passport", number: 2, label: "Passport Scan" },
  { id: "personal", number: 3, label: "Personal Info" },
  { id: "travel", number: 4, label: "Travel Details" },
  { id: "documents", number: 5, label: "Documents" },
  { id: "review", number: 6, label: "Review" },
];

export const APPLY_PAGE = {
  title: "Afghanistan Visa Application",
  requirementsHeading: "Visa Requirements",
  requirementsSubtitle: "Select visa type, review requirements and fees.",
  importantNoticeTitle: "Important",
  importantNoticeBody:
    "Ensure all documents are clear and legible. Incomplete submissions may cause delays.",
  processingHeading: "Processing Time",
  documentsHeading: "Documents Required",
  feesHeading: "Fees & Charges",
  passportHeading: "Upload Passport",
  passportSubtitle: "OCR reads the bio page MRZ, then you review before Personal Info",
  passportInfo:
    "Upload a clear photo of your passport bio page (with photo + MRZ at the bottom) and a passport-size photo (color, white background). We extract name, passport number, nationality, dates, and gender for you to review.",
  passportFrontTitle: "Passport bio page",
  passportFrontHint: "Bio page with MRZ lines at the bottom (JPG, PNG, or PDF)",
  passportPhotoTitle: "Passport Photo",
  passportPhotoHint: "Color, white bg (45×35 mm)",
  backToHome: "Back to Home",
  startApplication: "Start Application",
  previous: "Back",
  continue: "Continue",
  submit: "Submit Application",
} as const;

/* ── Universal form fields (Section 5.1) ── */

export const UNIVERSAL_PERSONAL_FIELDS: FormFieldDef[] = [
  { key: "fullName", label: "Full name", dataType: "text", required: true, placeholder: "As shown on passport" },
  { key: "dateOfBirth", label: "Date of birth", dataType: "date", required: true },
  {
    key: "sex",
    label: "Gender",
    dataType: "select",
    required: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ],
  },
  { key: "nationality", label: "Nationality", dataType: "select", required: true },
  { key: "countryOfResidence", label: "Country of residence", dataType: "select", required: true },
  { key: "passportNumber", label: "Passport number", dataType: "text", required: true },
  { key: "passportIssuingCountry", label: "Passport issuing country", dataType: "select", required: true },
  { key: "passportIssueDate", label: "Passport issue date", dataType: "date", required: true },
  { key: "passportExpiryDate", label: "Passport expiry date", dataType: "date", required: true, notes: "Must be ≥6 months from travel" },
  { key: "email", label: "Email", dataType: "email", required: true },
  { key: "phone", label: "Phone", dataType: "tel", required: true },
  {
    key: "address",
    label: "Residential address",
    dataType: "textarea",
    required: true,
    placeholder: "Street, city, postal code",
  },
];

export const UNIVERSAL_TRAVEL_FIELDS: FormFieldDef[] = [
  { key: "purposeOfTravel", label: "Purpose of travel", dataType: "textarea", required: true },
  { key: "intendedEntryDate", label: "Entry date", dataType: "date", required: true },
  { key: "intendedExitDate", label: "Exit date", dataType: "date", required: true },
  { key: "stayDurationDays", label: "Stay duration (days)", dataType: "number", required: true },
  { key: "addressInAfghanistan", label: "Address in Afghanistan", dataType: "textarea", required: true, placeholder: "Hotel / host address" },
];

export const SITUATION_FIELDS: FormFieldDef[] = [
  { key: "isMinor", label: "Applicant under 18", dataType: "checkbox", required: false, notes: "Parent/guardian passport & consent required" },
  { key: "isNonCitizenResident", label: "Non-citizen resident abroad", dataType: "checkbox", required: false, notes: "National ID or residence permit required" },
];

export const REVIEW_FIELDS: FormFieldDef[] = [
  { key: "digitalSignature", label: "Declaration", dataType: "checkbox", required: true, notes: "I declare all information provided is true and complete" },
];

/* ── Visa types — eVisa + Embassy (7 types from Research Section 3) ── */

export const VISA_TYPES: VisaTypeOption[] = [
  /* ═══════ eVISA TOURIST ═══════ */
  {
    code: "evisa_tourist",
    name: "Tourist eVisa",
    channel: "evisa",
    shortDescription: "Online • Single entry • 30 days • Kabul Airport only",
    documentLabels: [
      "Passport bio page (≥6 mo.)",
      "Photo 45×35 mm, white bg",
      "National ID / residence permit",
      "Facial verification",
      "Travel itinerary",
      "Accommodation proof",
      "Flight tickets",
    ],
    processingTime: "1–4 Weeks",
    processingNote: "Standard ~1–4 weeks. Express up to 1 business day.",
    fees: {
      title: "",
      lines: [
        { label: "Initial Fee", amount: "$8.25" },
        { label: "Remainder (Standard)", amount: "$123.71" },
        { label: "Express Surcharge", amount: "$50.00" },
      ],
      totalLabel: "Total",
      totalAmount: "$131.96",
      disclaimer: "USA remainder ~$206.19. Fees editable in Admin.",
    },
    documents: [
      { key: "passport_bio", label: "Passport bio page (≥6 mo. validity)", required: "required" },
      { key: "photo_45x35", label: "Photo 45×35 mm, white background", required: "required" },
      { key: "national_id", label: "National ID / residence permit", required: "conditional" },
      { key: "liveness", label: "Facial / liveness verification", required: "required" },
      { key: "parent_passport", label: "Parent passport (if under 18)", required: "conditional" },
      { key: "loi", label: "Invitation letter / LOI", required: "optional" },
      { key: "itinerary", label: "Travel itinerary", required: "recommended" },
      { key: "hotel", label: "Accommodation proof", required: "recommended" },
      { key: "flights", label: "Flight tickets", required: "recommended" },
    ],
    extraFormFields: [
      { key: "citiesToVisit", label: "Cities to visit", dataType: "textarea", required: true },
      {
        key: "processingSpeed",
        label: "Processing speed",
        dataType: "select",
        required: true,
        options: [
          { value: "standard", label: "Standard" },
          { value: "express", label: "Express (+$50)" },
        ],
      },
      { key: "sponsorName", label: "Sponsor name", dataType: "text", required: false, notes: "If LOI / sponsor path" },
      { key: "sponsorTazkira", label: "Sponsor Tazkira number", dataType: "text", required: false },
      { key: "sponsorAddress", label: "Sponsor address", dataType: "text", required: false },
    ],
  },

  /* ═══════ EMBASSY — TOURIST ═══════ */
  {
    code: "embassy_tourist",
    name: "Tourist",
    channel: "embassy",
    shortDescription: "Embassy • Single entry • ~1 month stay",
    documentLabels: [
      "Passport (≥6 mo. + blank pages)",
      "2 passport photos",
      "Invitation letter",
      "Flight bookings",
      "Hotel / accommodation",
      "Travel insurance",
      "Bank statement",
      "Itinerary",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy. Urgent options may be available.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
        { label: "Urgent", amount: "+€50" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Fees vary by mission & nationality — Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "invitation", label: "Invitation letter from sponsor / tour company", required: "optional" },
      { key: "flights", label: "Flight bookings", required: "required" },
      { key: "hotel", label: "Hotel / accommodation", required: "required" },
      { key: "insurance", label: "Travel insurance", required: "required" },
      { key: "bank", label: "Bank statement", required: "required" },
      { key: "itinerary", label: "Itinerary / places to visit", required: "optional" },
      { key: "tour_license", label: "Tour operator license copy", required: "optional" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [],
  },

  /* ═══════ EMBASSY — VISIT / FAMILY ═══════ */
  {
    code: "embassy_visit_family",
    name: "Visit / Family",
    channel: "embassy",
    shortDescription: "Embassy • Single entry • ~1 month stay",
    documentLabels: [
      "Passport + photos",
      "Host introduction letter",
      "Host ID / contact",
      "Flight + accommodation",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "host_letter", label: "Introduction letter from host in Afghanistan", required: "required" },
      { key: "host_id", label: "Host identity / contact details", required: "required" },
      { key: "flights", label: "Flight tickets", required: "required" },
      { key: "hotel", label: "Accommodation / host address", required: "required" },
      { key: "mofa_letter", label: "MoFA authorization letter", required: "optional" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [
      { key: "hostName", label: "Host name in Afghanistan", dataType: "text", required: true },
      { key: "relationshipToHost", label: "Relationship to host", dataType: "text", required: true },
      { key: "hostContact", label: "Host phone / email", dataType: "text", required: true },
    ],
  },

  /* ═══════ EMBASSY — BUSINESS ═══════ */
  {
    code: "embassy_business",
    name: "Business",
    channel: "embassy",
    shortDescription: "Embassy • Single / multiple entry • Up to 3 years",
    documentLabels: [
      "Passport + photos",
      "Company introduction letter",
      "MoFA authorization",
      "Business license",
      "Bank / tax proof",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "company_letter", label: "Employer / company introduction letter", required: "required" },
      { key: "mofa_auth", label: "MoFA authorization / reference number", required: "required" },
      { key: "business_license", label: "Business license / work permit", required: "optional" },
      { key: "bank_tax", label: "Tax / bank proof of commercial activity", required: "optional" },
      { key: "chamber_letter", label: "Chamber of Commerce letter", required: "optional" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [
      { key: "companyName", label: "Company name", dataType: "text", required: true },
      { key: "designation", label: "Designation / role", dataType: "text", required: true },
      { key: "companyAddressAF", label: "Company address in Afghanistan", dataType: "text", required: true },
      { key: "mofaRefNumber", label: "MoFA reference number", dataType: "text", required: true },
      { key: "meetingsPurpose", label: "Meetings / commercial purpose", dataType: "textarea", required: true },
    ],
  },

  /* ═══════ EMBASSY — WORK ═══════ */
  {
    code: "embassy_work",
    name: "Work",
    channel: "embassy",
    shortDescription: "Embassy • Per MoFA authorization",
    documentLabels: [
      "Passport + photos",
      "Employer invitation",
      "MoFA confirmation",
      "Education documents",
      "Employment contract",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "employer_invitation", label: "Invitation from Afghan employer", required: "required" },
      { key: "mofa_confirmation", label: "MoFA Consular Affairs confirmation", required: "required" },
      { key: "education_docs", label: "Educational documents", required: "required" },
      { key: "employment_contract", label: "Employment contract / job details", required: "required" },
      { key: "financial_guarantee", label: "Financial guarantee / sponsorship", required: "optional" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [
      { key: "employerName", label: "Employer name in Afghanistan", dataType: "text", required: true },
      { key: "jobTitle", label: "Job title", dataType: "text", required: true },
      { key: "contractDuration", label: "Contract duration", dataType: "text", required: true },
    ],
  },

  /* ═══════ EMBASSY — TRANSIT ═══════ */
  {
    code: "embassy_transit",
    name: "Transit",
    channel: "embassy",
    shortDescription: "Embassy • 72h air / 6 days land",
    documentLabels: [
      "Passport + photos",
      "Onward travel ticket",
      "Destination country visa",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "onward_ticket", label: "Onward travel ticket to final destination", required: "required" },
      { key: "destination_visa", label: "Visa for destination country", required: "required" },
      { key: "health_clearance", label: "Health clearance", required: "optional" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [
      { key: "finalDestination", label: "Final destination country", dataType: "text", required: true },
      {
        key: "transitMode",
        label: "Transit mode",
        dataType: "select",
        required: true,
        options: [
          { value: "air", label: "Air (max 72h)" },
          { value: "land", label: "Land (max 6 days)" },
        ],
      },
      { key: "transitDuration", label: "Transit duration", dataType: "text", required: true },
    ],
  },

  /* ═══════ EMBASSY — JOURNALIST / MEDIA ═══════ */
  {
    code: "embassy_journalist",
    name: "Journalist / Media",
    channel: "embassy",
    shortDescription: "Embassy • MoFA Media coordination required",
    documentLabels: [
      "Passport + photos",
      "News agency letter",
      "Press card",
      "MoFA Media coordination",
      "Accommodation / itinerary",
    ],
    processingTime: "Mission Dependent",
    processingNote: "Varies by embassy. MoFA coordination required.",
    fees: {
      title: "",
      lines: [
        { label: "Visa Fee", amount: "Varies" },
        { label: "Service Fee", amount: "Varies" },
      ],
      totalLabel: "Total",
      totalAmount: "Mission quote",
      disclaimer: "Admin configured.",
    },
    documents: [
      { key: "passport", label: "Passport (≥6 mo. + blank pages)", required: "required" },
      { key: "photos", label: "2 passport photos (white bg)", required: "required" },
      { key: "agency_letter", label: "Introduction letter from news agency", required: "required" },
      { key: "press_card", label: "Press card", required: "required" },
      { key: "mofa_media", label: "MoFA Media Relations coordination", required: "required" },
      { key: "hotel", label: "Accommodation / itinerary", required: "required" },
      { key: "local_id", label: "Local ID / residence proof", required: "conditional" },
    ],
    extraFormFields: [
      { key: "newsAgency", label: "News agency name", dataType: "text", required: true },
      { key: "pressCardNumber", label: "Press card number", dataType: "text", required: true },
      { key: "reportingPurpose", label: "Reporting purpose", dataType: "textarea", required: true },
      { key: "destinationsToVisit", label: "Destinations to visit", dataType: "textarea", required: true },
      { key: "whoToMeet", label: "Who to meet", dataType: "textarea", required: false },
    ],
  },
];

export function getVisaType(code: string): VisaTypeOption | undefined {
  return VISA_TYPES.find((v) => v.code === code);
}

export function getVisaTypesByChannel(channel: "evisa" | "embassy"): VisaTypeOption[] {
  return VISA_TYPES.filter((v) => v.channel === channel);
}

export function requirementLabel(level: DocumentItem["required"]): string {
  if (level === "required") return "Required";
  if (level === "optional") return "Optional";
  if (level === "recommended") return "Recommended";
  return "If applicable";
}

/* ── eVisa eligibility (Research Section 4) ── */

/** Section 4.1 — Nationalities blocked from eVisa */
export const EVISA_BLOCKED_NATIONALITIES: string[] = [
  "afghanistan",
  "pakistan",
  "iran",
  "tajikistan",
  "uzbekistan",
  "turkmenistan",
  "kazakhstan",
  "israel",
];

/** Section 4.2 — Countries of residence that block eVisa */
export const EVISA_BLOCKED_RESIDENCES: string[] = [
  "azerbaijan",
  "china",
  "india",
  "indonesia",
  "kyrgyzstan",
  "malaysia",
  "oman",
  "qatar",
  "russia",
  "turkey",
  "saudi-arabia",
  "uae",
  "kazakhstan",
];

/** Israel = hard refuse all visa types (Section 4.1 + 6.3) */
export const HARD_REFUSE_NATIONALITIES: string[] = ["israel"];

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "blocked_nationality" | "blocked_residence" | "hard_refuse" };

export function checkEvisaEligibility(
  nationality: string,
  countryOfResidence: string
): EligibilityResult {
  if (HARD_REFUSE_NATIONALITIES.includes(nationality)) {
    return { eligible: false, reason: "hard_refuse" };
  }
  if (EVISA_BLOCKED_NATIONALITIES.includes(nationality)) {
    return { eligible: false, reason: "blocked_nationality" };
  }
  if (EVISA_BLOCKED_RESIDENCES.includes(countryOfResidence)) {
    return { eligible: false, reason: "blocked_residence" };
  }
  return { eligible: true };
}