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
    activeInbox: number;
    underReview: number;
    approvedInPeriod: number;
    avgTurnaroundDays: number | null;
    activeInboxDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    underReviewDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    approvedDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
    turnaroundDelta: { delta: string; trend: 'up' | 'down' | 'flat' };
  };
  summary: {
    total: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    rejectionRate: number;
  };
  byStatus: Array<{ _id: string; count: number }>;
  byVisaType: Array<{ _id: string; count: number }>;
  monthlyTrend: Array<{
    month: string;
    year: number;
    received: number;
    approved: number;
    rejected: number;
  }>;
  staffLoad: Array<{ staffId?: string; name: string; cases: number }>;
  turnaround: {
    avgHours: number;
    minHours: number;
    maxHours: number;
    sampleSize: number;
  };
};

const STATUS_META: Record<string, { name: string; color: string }> = {
  sent_to_embassy: { name: 'New at mission', color: '#8061d9' },
  under_embassy_review: { name: 'Under review', color: '#16161f' },
  documents_required: { name: 'Docs required', color: '#ffba38' },
  approved: { name: 'Approved', color: '#2f9e6b' },
  visa_issued: { name: 'Visa issued', color: '#1a6b45' },
  rejected: { name: 'Rejected', color: '#d64545' },
  pending: { name: 'Pending', color: '#ffba38' },
  closed: { name: 'Closed', color: '#6b6b7b' },
};

function humanVisaType(code: string) {
  return code
    .replace(/^embassy_/, '')
    .replace(/^evisa_/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function periodQuery(period: 'monthly' | 'quarterly' | 'yearly') {
  if (period === 'quarterly') {
    const to = new Date();
    const from = new Date();
    from.setUTCMonth(from.getUTCMonth() - 3);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }
  return { period };
}

export async function fetchDashboard(params: {
  period?: 'monthly' | 'quarterly' | 'yearly';
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
      id: 'inbox',
      label: 'Active application',
      value: String(kpis.activeInbox),
      delta: kpis.activeInboxDelta.delta,
      trend: kpis.activeInboxDelta.trend,
      hint: 'awaiting embassy action',
    },
    {
      id: 'review',
      label: 'Under review',
      value: String(kpis.underReview),
      delta: kpis.underReviewDelta.delta,
      trend: kpis.underReviewDelta.trend,
      hint: 'in embassy review',
    },
    {
      id: 'approved',
      label: 'Approved (period)',
      value: String(kpis.approvedInPeriod),
      delta: kpis.approvedDelta.delta,
      trend: kpis.approvedDelta.trend,
      hint: `${data.summary.approvalRate}% approval rate`,
    },
    {
      id: 'turnaround',
      label: 'Avg turnaround',
      value: kpis.avgTurnaroundDays != null ? `${kpis.avgTurnaroundDays}d` : '—',
      delta: kpis.turnaroundDelta.delta,
      trend: kpis.turnaroundDelta.trend,
      hint:
        data.turnaround.sampleSize > 0
          ? `from ${data.turnaround.sampleSize} decided cases`
          : 'no decided cases yet',
    },
  ];
}

export function buildStatusBreakdown(byStatus: DashboardData['byStatus']): StatusSlice[] {
  return byStatus
    .filter((row) => row.count > 0)
    .map((row) => {
      const meta = STATUS_META[row._id] || {
        name: row._id.replaceAll('_', ' '),
        color: '#6b6b7b',
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
