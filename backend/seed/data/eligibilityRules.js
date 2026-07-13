/**
 * ISO 3166-1 alpha-2 country codes.
 * Dual filter: nationality AND residence must both be allowed for eVisa.
 */

const eligibilityRules = [
  {
    visaTypeCode: 'evisa_tourist',
    blockedNationalities: ['AF', 'PK', 'IR', 'TJ', 'UZ', 'TM', 'KZ', 'IL'],
    blockedResidences: [
      'AZ',
      'CN',
      'IN',
      'ID',
      'KG',
      'MY',
      'OM',
      'QA',
      'RU',
      'TR',
      'SA',
      'AE',
      'KZ',
      'IL',
    ],
    hardRefuseNationalities: ['IL'],
    notes:
      'eVisa requires both nationality and residence to be allowed. Israeli citizens are refused all visa categories.',
  },
  {
    visaTypeCode: 'embassy_tourist',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
  {
    visaTypeCode: 'embassy_visit_family',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
  {
    visaTypeCode: 'embassy_business',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
  {
    visaTypeCode: 'embassy_work',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
  {
    visaTypeCode: 'embassy_transit',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
  {
    visaTypeCode: 'embassy_journalist',
    blockedNationalities: [],
    blockedResidences: [],
    hardRefuseNationalities: ['IL'],
    notes: 'Embassy path available unless hard-refused (Israel).',
  },
];

module.exports = eligibilityRules;
