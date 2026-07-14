import { apiFetch } from './client';

export type EmailTemplate = {
  _id: string;
  code: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  placeholders?: string[];
  isActive: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type UpsertEmailTemplateInput = {
  code: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  placeholders?: string[];
  isActive?: boolean;
};

export async function listEmailTemplates() {
  return apiFetch<EmailTemplate[]>('/email-templates');
}

export async function upsertEmailTemplate(body: UpsertEmailTemplateInput) {
  return apiFetch<EmailTemplate>('/email-templates', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
