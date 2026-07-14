import { apiFetch } from './client';
import {
  DEFAULT_DISCLAIMER,
  DEFAULT_EMBASSY_LOGO,
  DEFAULT_PLACEHOLDERS,
  DEFAULT_SALAAM_LOGO,
  createEmptyTemplate,
  type AccentColor,
  type TemplatePlaceholder,
  type VisaTemplate,
  type VisaType,
} from '../features/visa-templates/types';

export const EVISA_TEMPLATE_CODE = 'evisa_default';

export type VisaTypeKey = VisaType;

export type BackendVisaTemplate = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  placeholders?: Array<{ key: string; label: string }>;
  fieldsByVisaType?: Record<string, Array<{ key: string; label: string }>> | Map<string, unknown>;
  layout?: {
    govLine?: string;
    ministryLine?: string;
    systemLine?: string;
    sectionTitle?: string;
    accentColor?: string;
    fontSize?: number;
    salaamLogoUrl?: string | null;
    embassyLogoUrl?: string | null;
    disclaimer?: string;
    showPhoto?: boolean;
    showPageNumbers?: boolean;
  };
  includeQr?: boolean;
  includeBarcode?: boolean;
  logoImageUrl?: string;
  sealImageUrl?: string;
  isDefault?: boolean;
  isActive?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

const VISA_TYPES: VisaType[] = ['tourist', 'business', 'student', 'transit'];

function asFieldMap(
  raw: BackendVisaTemplate['fieldsByVisaType']
): Record<VisaType, TemplatePlaceholder[]> {
  const src =
    raw && typeof raw === 'object' && !(raw instanceof Map)
      ? (raw as Record<string, Array<{ key: string; label: string }>>)
      : {};

  const out = {} as Record<VisaType, TemplatePlaceholder[]>;
  for (const vt of VISA_TYPES) {
    const list = Array.isArray(src[vt]) ? src[vt] : DEFAULT_PLACEHOLDERS;
    out[vt] = list.map((f, i) => ({
      id: `ph-${vt}-${i}-${f.key}`,
      key: f.key as TemplatePlaceholder['key'],
      label: f.label,
    }));
  }
  return out;
}

/** Map API document → FE editor model */
export function fromApiTemplate(
  doc: BackendVisaTemplate,
  activeVisaType: VisaType = 'tourist'
): VisaTemplate & { fieldsByVisaType: Record<VisaType, TemplatePlaceholder[]> } {
  const layout = doc.layout || {};
  const fieldsByVisaType = asFieldMap(doc.fieldsByVisaType);
  const placeholders =
    fieldsByVisaType[activeVisaType]?.map((p) => ({ ...p })) ||
    DEFAULT_PLACEHOLDERS.map((p) => ({ ...p }));

  return {
    ...createEmptyTemplate({
      id: doc._id,
      name: doc.name || 'Salaam eVISA Template',
      visaType: activeVisaType,
      status: doc.isActive === false ? 'draft' : 'active',
      isDefault: doc.isDefault !== false,
      updatedAt: (doc.updatedAt || '').slice(0, 10),
      accentColor: (layout.accentColor as AccentColor) || '#1B4D45',
      fontSize: layout.fontSize || 13,
      header: {
        title: layout.govLine || 'Islamic Emirate of Afghanistan — Visa',
        addressLine: layout.ministryLine || 'Ministry of Foreign Affairs',
        govLine: layout.govLine || 'ISLAMIC EMIRATE OF AFGHANISTAN',
        ministryLine: layout.ministryLine || 'Ministry of Foreign Affairs',
        systemLine: layout.systemLine || 'Salaam Afghanistan — Electronic Visa System',
        sectionTitle: layout.sectionTitle || 'eVISA Holder Information',
        salaamLogoUrl: layout.salaamLogoUrl || doc.logoImageUrl || DEFAULT_SALAAM_LOGO,
        embassyLogoUrl: layout.embassyLogoUrl || doc.sealImageUrl || DEFAULT_EMBASSY_LOGO,
      },
      body: {
        placeholders,
        showPhoto: layout.showPhoto !== false,
        showQr: doc.includeBarcode !== false,
      },
      footer: {
        disclaimer: layout.disclaimer || DEFAULT_DISCLAIMER,
        signatureUrl: null,
        stampUrl: null,
        showPageNumbers: Boolean(layout.showPageNumbers),
      },
    }),
    fieldsByVisaType,
  };
}

/** Map FE editor model → API upsert body */
export function toApiPayload(
  template: VisaTemplate & { fieldsByVisaType?: Record<VisaType, TemplatePlaceholder[]> }
) {
  const fieldsByVisaType: Record<string, Array<{ key: string; label: string }>> = {};
  const source = template.fieldsByVisaType || {
    tourist: template.body.placeholders,
    business: template.body.placeholders,
    student: template.body.placeholders,
    transit: template.body.placeholders,
  };

  // Keep current visa-type fields in sync with editor body
  source[template.visaType] = template.body.placeholders;

  for (const vt of VISA_TYPES) {
    fieldsByVisaType[vt] = (source[vt] || DEFAULT_PLACEHOLDERS).map((f) => ({
      key: f.key,
      label: f.label,
    }));
  }

  return {
    code: EVISA_TEMPLATE_CODE,
    name: template.name || 'Salaam eVISA Template',
    description: 'Single production eVISA sheet — fields vary by visa type',
    activeVisaType: template.visaType,
    placeholders: fieldsByVisaType[template.visaType],
    fieldsByVisaType,
    layout: {
      govLine: template.header.govLine,
      ministryLine: template.header.ministryLine,
      systemLine: template.header.systemLine,
      sectionTitle: template.header.sectionTitle,
      accentColor: template.accentColor,
      fontSize: template.fontSize,
      salaamLogoUrl: template.header.salaamLogoUrl || DEFAULT_SALAAM_LOGO,
      embassyLogoUrl: template.header.embassyLogoUrl || DEFAULT_EMBASSY_LOGO,
      disclaimer: template.footer.disclaimer,
      showPhoto: template.body.showPhoto,
      showPageNumbers: template.footer.showPageNumbers,
    },
    includeQr: true,
    includeBarcode: template.body.showQr,
    logoImageUrl: template.header.salaamLogoUrl || DEFAULT_SALAAM_LOGO,
    sealImageUrl: template.header.embassyLogoUrl || DEFAULT_EMBASSY_LOGO,
    isDefault: true,
    isActive: template.status !== 'draft',
  };
}

export async function listVisaTemplates() {
  return apiFetch<BackendVisaTemplate[]>('/visa-templates');
}

export async function getDefaultVisaTemplate() {
  return apiFetch<BackendVisaTemplate>('/visa-templates/default');
}

export async function saveVisaTemplate(
  template: VisaTemplate & { fieldsByVisaType?: Record<VisaType, TemplatePlaceholder[]> }
) {
  return apiFetch<BackendVisaTemplate>('/visa-templates', {
    method: 'PUT',
    body: JSON.stringify(toApiPayload(template)),
  });
}
