const EVISA_TEMPLATE_CODE = 'evisa_default';

const DEFAULT_EVISA_FIELDS = [
  { key: 'visa_number', label: 'eVISA Number' },
  { key: 'ref_number', label: 'Ref. Number' },
  { key: 'issue_date', label: 'eVISA Issue Date' },
  { key: 'expiry_date', label: 'eVISA Expire Date' },
  { key: 'place_of_issue', label: 'Place of Issue' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'visa_fee', label: 'Visa Fee' },
  { key: 'gender', label: 'Gender' },
  { key: 'applicant_name', label: 'Full Name' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'travel_document', label: 'Travel Document' },
  { key: 'passport_no', label: 'Travel Doc. No' },
  { key: 'travel_doc_issue', label: 'Travel Doc. Issue' },
  { key: 'travel_doc_expiry', label: 'Travel Doc. Expiry' },
];

const VISA_TYPE_KEYS = ['tourist', 'business', 'student', 'transit'];

function cloneFields(extra = {}) {
  return DEFAULT_EVISA_FIELDS.map((f, i) => ({
    ...f,
    x: 72,
    y: 200 + i * 18,
    fontSize: 11,
    ...extra,
  }));
}

function buildDefaultFieldsByVisaType() {
  const map = {};
  for (const key of VISA_TYPE_KEYS) {
    map[key] = cloneFields();
  }
  return map;
}

/** Map application.visaTypeCode → template field set key */
function resolveVisaTypeKey(visaTypeCode) {
  const code = String(visaTypeCode || '').toLowerCase();
  if (code.includes('business')) return 'business';
  if (code.includes('student')) return 'student';
  if (code.includes('transit')) return 'transit';
  if (code.includes('tourist') || code.includes('visit') || code.includes('family')) return 'tourist';
  if (VISA_TYPE_KEYS.includes(code)) return code;
  return 'tourist';
}

function fieldsForVisaType(template, visaTypeCode) {
  const key = resolveVisaTypeKey(visaTypeCode);
  let list = [];

  if (template.fieldsByVisaType) {
    if (typeof template.fieldsByVisaType.get === 'function') {
      list = template.fieldsByVisaType.get(key) || [];
    } else if (typeof template.fieldsByVisaType === 'object') {
      list = template.fieldsByVisaType[key] || [];
    }
  }

  if (!list.length && Array.isArray(template.placeholders) && template.placeholders.length) {
    list = template.placeholders;
  }
  if (!list.length) list = cloneFields();
  return { key, fields: list };
}

const defaultEvisaTemplateSeed = {
  code: EVISA_TEMPLATE_CODE,
  name: 'Salaam eVISA Template',
  description: 'Single production eVISA sheet — fields vary by visa type',
  pageWidth: 595,
  pageHeight: 842,
  includeQr: true,
  includeBarcode: true,
  isDefault: true,
  isActive: true,
  logoImageUrl: '/Logo.png',
  sealImageUrl: '/taliban-flag.png',
  placeholders: cloneFields(),
  fieldsByVisaType: buildDefaultFieldsByVisaType(),
  layout: {
    govLine: 'ISLAMIC EMIRATE OF AFGHANISTAN',
    ministryLine: 'Ministry of Foreign Affairs',
    systemLine: 'Salaam Afghanistan — Electronic Visa System',
    sectionTitle: 'eVISA Holder Information',
    accentColor: '#1B4D45',
    fontSize: 11,
    salaamLogoUrl: '/Logo.png',
    embassyLogoUrl: '/taliban-flag.png',
    disclaimer:
      'This electronic visa authorizes travel to Afghanistan but does not guarantee entry. Travelers are subject to inspection by border and immigration officers. The Islamic Emirate of Afghanistan reserves the right to refuse admission. Alteration or misuse of this document is a punishable offence.',
    showPhoto: true,
    showPageNumbers: false,
  },
};

module.exports = {
  EVISA_TEMPLATE_CODE,
  DEFAULT_EVISA_FIELDS,
  VISA_TYPE_KEYS,
  cloneFields,
  buildDefaultFieldsByVisaType,
  resolveVisaTypeKey,
  fieldsForVisaType,
  defaultEvisaTemplateSeed,
};
