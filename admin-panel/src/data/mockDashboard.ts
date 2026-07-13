export type OverviewStat = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  hint: string;
};

export const OVERVIEW_STATS: OverviewStat[] = [
  {
    id: 'applications',
    label: 'Total applications',
    value: '1,284',
    delta: '+12.4%',
    trend: 'up',
    hint: 'vs last month',
  },
  {
    id: 'pending',
    label: 'Pending review',
    value: '86',
    delta: '-8.1%',
    trend: 'down',
    hint: 'queue clearing',
  },
  {
    id: 'embassy',
    label: 'At embassy',
    value: '142',
    delta: '+4.2%',
    trend: 'up',
    hint: 'across 3 posts',
  },
  {
    id: 'revenue',
    label: 'Revenue (MTD)',
    value: '$48.6k',
    delta: '+18.0%',
    trend: 'up',
    hint: 'fees collected',
  },
];

export const APPLICATIONS_TREND = [
  { month: 'Jan', applications: 72, issued: 48 },
  { month: 'Feb', applications: 88, issued: 61 },
  { month: 'Mar', applications: 95, issued: 70 },
  { month: 'Apr', applications: 110, issued: 82 },
  { month: 'May', applications: 126, issued: 94 },
  { month: 'Jun', applications: 134, issued: 101 },
  { month: 'Jul', applications: 148, issued: 112 },
];

export const STATUS_BREAKDOWN = [
  { name: 'Pending', value: 86, color: '#c9a227' },
  { name: 'Docs required', value: 34, color: '#c47a2c' },
  { name: 'At embassy', value: 142, color: '#2a6f8f' },
  { name: 'Approved', value: 58, color: '#1a7a4c' },
  { name: 'Issued', value: 210, color: '#0b3d2e' },
  { name: 'Rejected', value: 22, color: '#b33a3a' },
];

export const VISA_TYPE_VOLUME = [
  { type: 'Tourist', count: 420 },
  { type: 'Business', count: 268 },
  { type: 'Student', count: 146 },
  { type: 'Family', count: 98 },
  { type: 'Transit', count: 72 },
];

export const EMBASSY_VOLUME = [
  { embassy: 'Dubai', count: 512 },
  { embassy: 'Istanbul', count: 286 },
  { embassy: 'Islamabad', count: 198 },
];

export const REVENUE_TREND = [
  { month: 'Jan', revenue: 28 },
  { month: 'Feb', revenue: 31 },
  { month: 'Mar', revenue: 34 },
  { month: 'Apr', revenue: 39 },
  { month: 'May', revenue: 42 },
  { month: 'Jun', revenue: 45 },
  { month: 'Jul', revenue: 49 },
];
