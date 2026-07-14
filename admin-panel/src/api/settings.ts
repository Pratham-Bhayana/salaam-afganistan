import { apiFetch } from './client';

export type BrandingSettings = {
  platformName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
};

export type NotificationSettings = {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  statusChangeEmails?: boolean;
  documentRequestEmails?: boolean;
  visaIssuedEmails?: boolean;
};

export type LocalizationSettings = {
  languages?: string[];
  defaultLanguage?: string;
  currencies?: string[];
  defaultCurrency?: string;
};

export type SecuritySettings = {
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  requireMfaForAdmin?: boolean;
};

export type SystemSettings = {
  maintenanceMode?: boolean;
  allowManualApplications?: boolean;
  autoGenerateVisaOnApprove?: boolean;
};

export type PlatformSettings = {
  _id?: string;
  key?: string;
  branding?: BrandingSettings;
  notifications?: NotificationSettings;
  localization?: LocalizationSettings;
  security?: SecuritySettings;
  system?: SystemSettings;
  updatedBy?: string | { _id?: string } | null;
  updatedAt?: string;
  createdAt?: string;
};

export type SettingsPatch = {
  branding?: BrandingSettings;
  notifications?: NotificationSettings;
  localization?: LocalizationSettings;
  security?: SecuritySettings;
  system?: SystemSettings;
};

export async function getSettings() {
  return apiFetch<PlatformSettings>('/settings');
}

export async function updateSettings(body: SettingsPatch) {
  return apiFetch<PlatformSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function defaultBranding(): BrandingSettings {
  return {
    platformName: 'Salaam Afghanistan',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#0B3D2E',
    secondaryColor: '#C4A35A',
    supportEmail: '',
    supportPhone: '',
  };
}

export function defaultNotifications(): NotificationSettings {
  return {
    emailEnabled: true,
    inAppEnabled: true,
    statusChangeEmails: true,
    documentRequestEmails: true,
    visaIssuedEmails: true,
  };
}

export function defaultLocalization(): LocalizationSettings {
  return {
    languages: ['en'],
    defaultLanguage: 'en',
    currencies: ['USD'],
    defaultCurrency: 'USD',
  };
}

export function defaultSecurity(): SecuritySettings {
  return {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireMfaForAdmin: false,
  };
}

export function defaultSystem(): SystemSettings {
  return {
    maintenanceMode: false,
    allowManualApplications: true,
    autoGenerateVisaOnApprove: true,
  };
}
