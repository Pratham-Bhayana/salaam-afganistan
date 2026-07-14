import { apiFetch, apiFetchBlob } from './client';

export type IssuedVisa = {
  _id: string;
  visaNumber: string;
  referenceId?: string;
  visaTypeCode?: string;
  applicantName?: string;
  storagePath?: string;
  document?: string;
  validFrom?: string;
  validUntil?: string;
  issuedAt?: string;
};

export async function previewVisaPdf(applicationId: string) {
  const { blob, headers } = await apiFetchBlob('/issued-visas/preview', {
    method: 'POST',
    body: JSON.stringify({ applicationId }),
  });
  return {
    blob,
    visaNumber: headers.get('X-Visa-Preview-Number') || '',
    referenceId: headers.get('X-Visa-Reference-Id') || '',
    applicantEmail: headers.get('X-Applicant-Email') || '',
    applicantName: decodeURIComponent(headers.get('X-Applicant-Name') || ''),
  };
}

export async function issueVisa(body: {
  applicationId: string;
  force?: boolean;
  sendEmail?: boolean;
}) {
  return apiFetch<IssuedVisa>('/issued-visas/issue', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function downloadIssuedVisa(issuedVisaId: string) {
  return apiFetchBlob(`/issued-visas/${issuedVisaId}/download`);
}

export async function downloadApplicationDocument(documentId: string) {
  return apiFetchBlob(`/documents/${documentId}/download`);
}
