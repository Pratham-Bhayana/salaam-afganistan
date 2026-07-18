import { apiFetch } from './client';

export type OverviewStat = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  hint: string;
};

export type StatusSlice = {
  name: string;
  value: number;
  color: string;
};

export type DashboardData = {
  kpis: {
    totalApplications: number;
    pendingReview: number;
    atEmbassy: number;
    activeEmbassies: number;
    revenue: number;
    totalApplicationsDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    revenueDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    pendingDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    embassyDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
  };
  byStatus: Array<{ _id: string; count: number }>;
  byVisaType: Array<{ _id: string; count: number }>;
  byEmbassy: Array<{ embassy: string; code?: string; count: number }>;
  monthlyTrend: Array<{
    month: string;
    year: number;
    applications: number;
    issued: number;
    revenue: number;
  }>;
  revenue: {
    total: number;
    paymentCount: number;
  };
};

const STATUS_META: Record<string, { name: string; color: string }> = {
  draft: { name: 'Draft', color: '#8a9a94' },
  pending: { name: 'Pending', color: '#c9a227' },
  documents_required: { name: 'Docs required', color: '#c47a2c' },
  sent_to_embassy: { name: 'Sent to embassy', color: '#2a6f8f' },
  under_embassy_review: { name: 'Embassy review', color: '#3d6b8c' },
  approved: { name: 'Approved', color: '#1a7a4c' },
  visa_issued: { name: 'Issued', color: '#0b3d2e' },
  rejected: { name: 'Rejected', color: '#b33a3a' },
  closed: { name: 'Closed', color: '#6b7c75' },
  archived: { name: 'Archived', color: '#a8b5b0' },
};

function humanVisaType(code: string) {
  return code
    .replace(/^embassy_/, '')
    .replace(/^evisa_/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCount(n: number) {
  return n.toLocaleString();
}

function formatRevenue(amount: number) {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

export type PeriodKey = 'monthly' | 'quarterly' | 'yearly';

export function periodQuery(period: PeriodKey) {
  if (period === 'quarterly') {
    const to = new Date();
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 3);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return { period };
}

export function periodLabel(period: PeriodKey) {
  if (period === 'monthly') return 'This month';
  if (period === 'quarterly') return 'Last 3 months';
  return 'This year';
}

export async function fetchDashboard(params: {
  period?: PeriodKey;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params.period) qs.set('period', params.period);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  return apiFetch<DashboardData>(`/dashboard?${qs.toString()}`);
}

export function buildOverviewStats(data: DashboardData): OverviewStat[] {
  const { kpis } = data;
  return [
    {
      id: 'applications',
      label: 'Total applications',
      value: formatCount(kpis.totalApplications),
      delta: kpis.totalApplicationsDelta.delta,
      trend: kpis.totalApplicationsDelta.trend,
      hint: 'in selected period',
    },
    {
      id: 'pending',
      label: 'Pending review',
      value: formatCount(kpis.pendingReview),
      delta: kpis.pendingDelta.delta,
      trend: kpis.pendingDelta.trend,
      hint: 'awaiting action',
    },
    {
      id: 'embassy',
      label: 'At embassy',
      value: formatCount(kpis.atEmbassy),
      delta: kpis.embassyDelta.delta,
      trend: kpis.embassyDelta.trend,
      hint: `across ${kpis.activeEmbassies} active posts`,
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: formatRevenue(kpis.revenue),
      delta: kpis.revenueDelta.delta,
      trend: kpis.revenueDelta.trend,
      hint: `${data.revenue.paymentCount} payments`,
    },
  ];
}

export function buildStatusBreakdown(byStatus: DashboardData['byStatus']): StatusSlice[] {
  return byStatus
    .filter((row) => row.count > 0)
    .map((row) => {
      const meta = STATUS_META[row._id] || {
        name: row._id.replaceAll('_', ' '),
        color: '#6b7c75',
      };
      return { name: meta.name, value: row.count, color: meta.color };
    });
}

export function buildVisaTypeVolume(byVisaType: DashboardData['byVisaType']) {
  return byVisaType.slice(0, 8).map((row) => ({
    type: humanVisaType(row._id || 'Other'),
    count: row.count,
  }));
}

export function buildEmbassyVolume(byEmbassy: DashboardData['byEmbassy']) {
  return byEmbassy.slice(0, 8).map((row) => ({
    embassy: row.code || row.embassy,
    count: row.count,
  }));
}

export function buildRevenueTrend(monthlyTrend: DashboardData['monthlyTrend']) {
  return monthlyTrend.map((row) => ({
    month: row.month,
    revenue: Number((row.revenue / 1000).toFixed(2)),
  }));
}
