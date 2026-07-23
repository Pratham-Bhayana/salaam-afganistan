export type VisaType = 'tourist' | 'business' | 'student' | 'transit';

export type TemplateStatus = 'active' | 'draft';

export type AccentColor = '#1B4D45' | '#0B3D2E' | '#C4A35A' | '#E8B84A';

/** Vite public assets — default logos on every new/mock template */
export const DEFAULT_SALAAM_LOGO = '/logo.png';
export const DEFAULT_EMBASSY_LOGO = '/taliban-flag.png';
export const DEFAULT_WATERMARK = '/taliban-flag.png';

export type PlaceholderKey =
  | 'visa_number'
  | 'ref_number'
  | 'issue_date'
  | 'expiry_date'
  | 'place_of_issue'
  | 'remarks'
  | 'visa_fee'
  | 'gender'
  | 'applicant_name'
  | 'date_of_birth'
  | 'nationality'
  | 'travel_document'
  | 'passport_no'
  | 'travel_doc_issue'
  | 'travel_doc_expiry'
  | 'visa_type'
  | 'embassy_name';

export type TemplatePlaceholder = {
  id: string;
  key: PlaceholderKey;
  /** Display label on the eVISA sheet (left column) */
  label: string;
};

export type VisaTemplate = {
  id: string;
  name: string;
  /** Currently edited visa-type field set */
  visaType: VisaType;
  status: TemplateStatus;
  isDefault: boolean;
  updatedAt: string;
  accentColor: AccentColor;
  fontSize: number;
  header: {
    /** @deprecated kept for compat — authority lines are preferred */
    title: string;
    addressLine: string;
    govLine: string;
    ministryLine: string;
    systemLine: string;
    sectionTitle: string;
    salaamLogoUrl: string | null;
    embassyLogoUrl: string | null;
  };
  body: {
    placeholders: TemplatePlaceholder[];
    showPhoto: boolean;
    /** Barcode strip under photo (sample eVISA style) */
    showQr: boolean;
  };
  footer: {
    disclaimer: string;
    signatureUrl: string | null;
    stampUrl: string | null;
    showPageNumbers: boolean;
  };
  /** Per visa-type field configurations persisted on the single backend template */
  fieldsByVisaType?: Record<VisaType, TemplatePlaceholder[]>;
};

export const VISA_TYPE_LABELS: Record<VisaType | 'all', string> = {
  all: 'All',
  tourist: 'Tourist',
  business: 'Business',
  student: 'Student',
  transit: 'Transit',
};

export const ACCENT_SWATCHES: AccentColor[] = ['#1B4D45', '#0B3D2E', '#C4A35A', '#E8B84A'];

export const DEFAULT_PLACEHOLDERS: TemplatePlaceholder[] = [
  { id: 'ph-1', key: 'visa_number', label: 'eVISA Number' },
  { id: 'ph-2', key: 'ref_number', label: 'Ref. Number' },
  { id: 'ph-3', key: 'issue_date', label: 'eVISA Issue Date' },
  { id: 'ph-4', key: 'expiry_date', label: 'eVISA Expire Date' },
  { id: 'ph-5', key: 'place_of_issue', label: 'Place of Issue' },
  { id: 'ph-6', key: 'remarks', label: 'Remarks' },
  { id: 'ph-7', key: 'visa_fee', label: 'Visa Fee' },
  { id: 'ph-8', key: 'gender', label: 'Gender' },
  { id: 'ph-9', key: 'applicant_name', label: 'Full Name' },
  { id: 'ph-10', key: 'date_of_birth', label: 'Date of Birth' },
  { id: 'ph-11', key: 'nationality', label: 'Nationality' },
  { id: 'ph-12', key: 'travel_document', label: 'Travel Document' },
  { id: 'ph-13', key: 'passport_no', label: 'Travel Doc. No' },
  { id: 'ph-14', key: 'travel_doc_issue', label: 'Travel Doc. Issue' },
  { id: 'ph-15', key: 'travel_doc_expiry', label: 'Travel Doc. Expiry' },
];

/** Sample filled values for preview mode */
export const PREVIEW_VALUES: Record<PlaceholderKey, string> = {
  visa_number: 'AF-7114532129',
  ref_number: 'SA-2026-88421',
  issue_date: '14 Jul 2026',
  expiry_date: '14 Jan 2027',
  place_of_issue: 'Kabul',
  remarks: 'Single entry',
  visa_fee: 'USD 80',
  gender: 'Male',
  applicant_name: 'AHMAD KARIMI',
  date_of_birth: '12 Mar 1992',
  nationality: 'Afghanistan',
  travel_document: 'Ordinary Passport',
  passport_no: 'P01234567',
  travel_doc_issue: '01 Jan 2024',
  travel_doc_expiry: '01 Jan 2034',
  visa_type: 'Tourist',
  embassy_name: 'Dubai Consulate',
};

export const DEFAULT_DISCLAIMER =
  'This electronic visa authorizes travel to Afghanistan but does not guarantee entry. Travelers are subject to inspection by border and immigration officers. The Islamic Emirate of Afghanistan reserves the right to refuse admission. Alteration or misuse of this document is a punishable offence.';

export function createEmptyTemplate(partial?: Partial<VisaTemplate>): VisaTemplate {
  const base: VisaTemplate = {
    id: `tpl-${Date.now()}`,
    name: 'Untitled Template',
    visaType: 'tourist',
    status: 'draft',
    isDefault: false,
    updatedAt: new Date().toISOString().slice(0, 10),
    accentColor: '#1B4D45',
    fontSize: 13,
    header: {
      title: 'Islamic Emirate of Afghanistan — Visa',
      addressLine: 'Ministry of Foreign Affairs · Consular Affairs',
      govLine: 'ISLAMIC EMIRATE OF AFGHANISTAN',
      ministryLine: 'Ministry of Foreign Affairs',
      systemLine: 'Salaam Afghanistan — Electronic Visa System',
      sectionTitle: 'eVISA Holder Information',
      salaamLogoUrl: DEFAULT_SALAAM_LOGO,
      embassyLogoUrl: DEFAULT_EMBASSY_LOGO,
    },
    body: {
      placeholders: DEFAULT_PLACEHOLDERS.map((p) => ({ ...p })),
      showPhoto: true,
      showQr: true,
    },
    footer: {
      disclaimer: DEFAULT_DISCLAIMER,
      signatureUrl: null,
      stampUrl: null,
      showPageNumbers: false,
    },
  };

  if (!partial) return base;

  return {
    ...base,
    ...partial,
    header: { ...base.header, ...(partial.header || {}) },
    body: {
      ...base.body,
      ...(partial.body || {}),
      placeholders:
        partial.body?.placeholders?.map((p) => ({ ...p })) ||
        base.body.placeholders.map((p) => ({ ...p })),
    },
    footer: { ...base.footer, ...(partial.footer || {}) },
  };
}
