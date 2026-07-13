export type ApplicationStatus =
  | 'pending'
  | 'documents_required'
  | 'sent_to_embassy'
  | 'under_embassy_review'
  | 'approved'
  | 'rejected'
  | 'visa_issued';

export type MockApplication = {
  id: string;
  applicantName: string;
  visaType: string;
  status: ApplicationStatus;
  embassy: string;
  submittedAt: string;
  reference: string;
};

export type ChatMessage = {
  id: string;
  from: 'admin' | 'applicant' | 'embassy';
  author: string;
  text: string;
  time: string;
};

export type ApplicationDetail = MockApplication & {
  documentName: string;
  documentId: string;
  assignedTo: { name: string; initials: string };
  alert?: string;
  applicant: {
    fullName: string;
    dateOfBirth: string;
    age: number;
    sex: string;
    nationality: string;
    email: string;
    phone: string;
  };
  passport: {
    number: string;
    issuingCountry: string;
    issueDate: string;
    expiryDate: string;
  };
  travel: {
    purpose: string;
    entryDate: string;
    exitDate: string;
    addressInAfghanistan: string;
  };
  payment: {
    status: string;
    amount: string;
    method: string;
  };
  messages: ChatMessage[];
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  documents_required: 'Docs Required',
  sent_to_embassy: 'Sent to Embassy',
  under_embassy_review: 'Embassy Review',
  approved: 'Approved',
  rejected: 'Rejected',
  visa_issued: 'Visa Issued',
};

export function statusLabel(status: ApplicationStatus) {
  return STATUS_LABELS[status];
}

export const MOCK_APPLICATIONS: MockApplication[] = [
  {
    id: '1',
    applicantName: 'Kristin Watson',
    visaType: 'Tourist',
    status: 'pending',
    embassy: 'Dubai (DXB)',
    submittedAt: '12 Jul 2026',
    reference: 'SA-2026-10482',
  },
  {
    id: '2',
    applicantName: 'Arlene McCoy',
    visaType: 'Business',
    status: 'documents_required',
    embassy: 'Istanbul (IST)',
    submittedAt: '11 Jul 2026',
    reference: 'SA-2026-10471',
  },
  {
    id: '3',
    applicantName: 'Darrell Steward',
    visaType: 'Tourist',
    status: 'sent_to_embassy',
    embassy: 'Dubai (DXB)',
    submittedAt: '10 Jul 2026',
    reference: 'SA-2026-10455',
  },
  {
    id: '4',
    applicantName: 'Courtney Henry',
    visaType: 'Student',
    status: 'under_embassy_review',
    embassy: 'Islamabad (ISB)',
    submittedAt: '09 Jul 2026',
    reference: 'SA-2026-10440',
  },
  {
    id: '5',
    applicantName: 'Jerome Bell',
    visaType: 'Tourist',
    status: 'approved',
    embassy: 'Dubai (DXB)',
    submittedAt: '08 Jul 2026',
    reference: 'SA-2026-10428',
  },
  {
    id: '6',
    applicantName: 'Cameron Williamson',
    visaType: 'Transit',
    status: 'visa_issued',
    embassy: 'Istanbul (IST)',
    submittedAt: '07 Jul 2026',
    reference: 'SA-2026-10412',
  },
  {
    id: '7',
    applicantName: 'Leslie Alexander',
    visaType: 'Business',
    status: 'rejected',
    embassy: 'Dubai (DXB)',
    submittedAt: '06 Jul 2026',
    reference: 'SA-2026-10398',
  },
  {
    id: '8',
    applicantName: 'Jacob Jones',
    visaType: 'Tourist',
    status: 'pending',
    embassy: 'Islamabad (ISB)',
    submittedAt: '05 Jul 2026',
    reference: 'SA-2026-10381',
  },
  {
    id: '9',
    applicantName: 'Annette Black',
    visaType: 'Family',
    status: 'sent_to_embassy',
    embassy: 'Dubai (DXB)',
    submittedAt: '04 Jul 2026',
    reference: 'SA-2026-10366',
  },
  {
    id: '10',
    applicantName: 'Guy Hawkins',
    visaType: 'Tourist',
    status: 'documents_required',
    embassy: 'Istanbul (IST)',
    submittedAt: '03 Jul 2026',
    reference: 'SA-2026-10350',
  },
  {
    id: '11',
    applicantName: 'Esther Howard',
    visaType: 'Business',
    status: 'under_embassy_review',
    embassy: 'Dubai (DXB)',
    submittedAt: '02 Jul 2026',
    reference: 'SA-2026-10339',
  },
  {
    id: '12',
    applicantName: 'Robert Fox',
    visaType: 'Tourist',
    status: 'visa_issued',
    embassy: 'Islamabad (ISB)',
    submittedAt: '01 Jul 2026',
    reference: 'SA-2026-10321',
  },
];

export const TOTAL_MOCK_COUNT = 256;

const DETAIL_EXTRAS: Record<
  string,
  Omit<ApplicationDetail, keyof MockApplication>
> = {
  '1': {
    documentName: 'Passport_Bio_Kristin.pdf',
    documentId: 'DOC-88421',
    assignedTo: { name: 'Amina Khan', initials: 'AK' },
    alert: 'Some documents are incomplete. Please request the missing pages from the applicant.',
    applicant: {
      fullName: 'Kristin Watson',
      dateOfBirth: '14 Mar 1992',
      age: 34,
      sex: 'Female',
      nationality: 'United Kingdom',
      email: 'kristin.watson@email.com',
      phone: '+971 50 123 4567',
    },
    passport: {
      number: 'GB12849301',
      issuingCountry: 'United Kingdom',
      issueDate: '02 Jan 2020',
      expiryDate: '01 Jan 2030',
    },
    travel: {
      purpose: 'Tourism',
      entryDate: '01 Aug 2026',
      exitDate: '20 Aug 2026',
      addressInAfghanistan: 'Kabul Serena Hotel',
    },
    payment: { status: 'Paid', amount: 'USD 120', method: 'Card' },
    messages: [
      {
        id: 'm1',
        from: 'applicant',
        author: 'Kristin Watson',
        text: 'I uploaded my passport scan. Please confirm if anything else is needed.',
        time: '10:12 AM',
      },
      {
        id: 'm2',
        from: 'admin',
        author: 'You',
        text: 'Thanks Kristin. We still need a clearer photo page and proof of accommodation.',
        time: '10:28 AM',
      },
      {
        id: 'm3',
        from: 'applicant',
        author: 'Kristin Watson',
        text: 'Understood — I will re-upload today.',
        time: '10:31 AM',
      },
    ],
  },
  '2': {
    documentName: 'Business_Invite_Arlene.pdf',
    documentId: 'DOC-88390',
    assignedTo: { name: 'Omar Farid', initials: 'OF' },
    alert: 'Invitation letter expiry is unclear. Please contact the applicant.',
    applicant: {
      fullName: 'Arlene McCoy',
      dateOfBirth: '22 Nov 1988',
      age: 37,
      sex: 'Female',
      nationality: 'United States',
      email: 'arlene.mccoy@email.com',
      phone: '+1 415 555 0198',
    },
    passport: {
      number: 'US55920114',
      issuingCountry: 'United States',
      issueDate: '11 May 2019',
      expiryDate: '10 May 2029',
    },
    travel: {
      purpose: 'Business meetings',
      entryDate: '15 Aug 2026',
      exitDate: '25 Aug 2026',
      addressInAfghanistan: 'Kabul Business Park',
    },
    payment: { status: 'Paid', amount: 'USD 180', method: 'Card' },
    messages: [
      {
        id: 'm1',
        from: 'admin',
        author: 'You',
        text: 'Please upload a renewed invitation letter from the host company.',
        time: 'Yesterday',
      },
      {
        id: 'm2',
        from: 'applicant',
        author: 'Arlene McCoy',
        text: 'I requested it from our partner in Kabul. Should arrive tomorrow.',
        time: 'Yesterday',
      },
    ],
  },
};

function buildDetailFromList(app: MockApplication): ApplicationDetail {
  const extra = DETAIL_EXTRAS[app.id];
  if (extra) return { ...app, ...extra };

  const initials = app.applicantName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    ...app,
    documentName: `${app.visaType}_Application.pdf`,
    documentId: `DOC-${10000 + Number(app.id)}`,
    assignedTo: { name: 'Case Desk', initials },
    alert:
      app.status === 'documents_required'
        ? 'Some documents are missing. Please contact the applicant.'
        : undefined,
    applicant: {
      fullName: app.applicantName,
      dateOfBirth: '01 Jan 1990',
      age: 36,
      sex: '—',
      nationality: '—',
      email: `${app.applicantName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      phone: '+971 50 000 0000',
    },
    passport: {
      number: `XX${app.id.padStart(7, '0')}`,
      issuingCountry: '—',
      issueDate: '01 Jan 2020',
      expiryDate: '01 Jan 2030',
    },
    travel: {
      purpose: app.visaType,
      entryDate: '01 Sep 2026',
      exitDate: '15 Sep 2026',
      addressInAfghanistan: 'Kabul',
    },
    payment: { status: 'Paid', amount: 'USD 120', method: 'Card' },
    messages: [
      {
        id: 'm1',
        from: 'admin',
        author: 'You',
        text: `Review started for ${app.reference}.`,
        time: '09:00 AM',
      },
      {
        id: 'm2',
        from: 'applicant',
        author: app.applicantName,
        text: 'Thank you. Happy to provide any extra documents needed.',
        time: '09:15 AM',
      },
    ],
  };
}

export function getApplicationById(id: string): ApplicationDetail | undefined {
  const base = MOCK_APPLICATIONS.find((a) => a.id === id);
  if (!base) return undefined;
  return buildDetailFromList(base);
}
