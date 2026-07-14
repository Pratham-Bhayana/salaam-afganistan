export type VisaType = 'tourist' | 'business' | 'student' | 'transit';

export type TemplateStatus = 'active' | 'draft';

export type AccentColor = '#1B4D45' | '#0B3D2E' | '#C4A35A' | '#E8B84A';

export type PlaceholderKey =
  | 'applicant_name'
  | 'passport_no'
  | 'visa_type'
  | 'issue_date'
  | 'expiry_date'
  | 'embassy_name'
  | 'visa_number';

export type TemplatePlaceholder = {
  id: string;
  key: PlaceholderKey;
  label: string;
};

export type VisaTemplate = {
  id: string;
  name: string;
  visaType: VisaType;
  status: TemplateStatus;
  isDefault: boolean;
  updatedAt: string;
  accentColor: AccentColor;
  fontSize: number;
  header: {
    title: string;
    addressLine: string;
    salaamLogoUrl: string | null;
    embassyLogoUrl: string | null;
  };
  body: {
    placeholders: TemplatePlaceholder[];
    showQr: boolean;
  };
  footer: {
    disclaimer: string;
    signatureUrl: string | null;
    stampUrl: string | null;
    showPageNumbers: boolean;
  };
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
  { id: 'ph-1', key: 'applicant_name', label: '{applicant_name}' },
  { id: 'ph-2', key: 'passport_no', label: '{passport_no}' },
  { id: 'ph-3', key: 'visa_type', label: '{visa_type}' },
  { id: 'ph-4', key: 'issue_date', label: '{issue_date}' },
  { id: 'ph-5', key: 'expiry_date', label: '{expiry_date}' },
  { id: 'ph-6', key: 'embassy_name', label: '{embassy_name}' },
  { id: 'ph-7', key: 'visa_number', label: '{visa_number}' },
];

export function createEmptyTemplate(partial?: Partial<VisaTemplate>): VisaTemplate {
  return {
    id: `tpl-${Date.now()}`,
    name: 'Untitled Template',
    visaType: 'tourist',
    status: 'draft',
    isDefault: false,
    updatedAt: new Date().toISOString().slice(0, 10),
    accentColor: '#1B4D45',
    fontSize: 14,
    header: {
      title: 'Islamic Emirate of Afghanistan — Visa',
      addressLine: 'Ministry of Foreign Affairs · Consular Affairs',
      salaamLogoUrl: null,
      embassyLogoUrl: null,
    },
    body: {
      placeholders: DEFAULT_PLACEHOLDERS.map((p) => ({ ...p })),
      showQr: true,
    },
    footer: {
      disclaimer:
        'This document is issued under the authority of the Islamic Emirate of Afghanistan. Alteration or misuse is a punishable offence.',
      signatureUrl: null,
      stampUrl: null,
      showPageNumbers: true,
    },
    ...partial,
  };
}
