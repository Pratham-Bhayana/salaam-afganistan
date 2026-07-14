export type RecordItem = {
  _id: string;
  visaId: string;
  applicantName: string;
  passportNumber: string;
  visaType: string;
  issueDate: string;
  validUntil: string;
};

export const mockRecords: RecordItem[] = [
  {
    _id: '1',
    visaId: 'LivMexico0033',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'eta',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
  {
    _id: '2',
    visaId: 'LivMexico0037',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'e-visa',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
  {
    _id: '3',
    visaId: 'LivMexico0035',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'sticker',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
  {
    _id: '4',
    visaId: 'LivMexico0034',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'sticker',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
  {
    _id: '5',
    visaId: 'LivMexico0032',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'sticker',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
  {
    _id: '6',
    visaId: 'LivMexico0030',
    applicantName: 'N/A',
    passportNumber: 'N/A',
    visaType: 'e-visa',
    issueDate: 'N/A',
    validUntil: 'N/A',
  },
];
