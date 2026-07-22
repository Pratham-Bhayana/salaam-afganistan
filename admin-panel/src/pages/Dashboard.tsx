import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';
import { ApiError } from '../api/client';
import {
  buildEmbassyVolume,
  buildOverviewStats,
  buildRevenueTrend,
  buildStatusBreakdown,
  buildVisaTypeVolume,
  fetchDashboard,
  periodLabel,
  periodQuery,
  type DashboardData,
  type PeriodKey,
} from '../api/dashboard';
import {
  fetchNotifications,
  markNotificationRead,
  notificationMessage,
  type PanelNotification,
} from '../api/notifications';
import { decrementNotifUnread, patchUnreadState, refreshUnreadCounts } from '../layout/unreadStore';
import './Dashboard.css';

const notificationsPanelStyle = {
  height: 'fit-content',
  minHeight: 'unset',
  maxHeight: 'none',
  alignSelf: 'start' as const,
};

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(26, 46, 40, 0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: '#1a2e28',
  boxShadow: '0 8px 24px rgba(26, 46, 40, 0.08)',
};

const POLL_MS = 15000;
const NOTIF_POLL_MS = 30000;

function formatNotifTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<PanelNotification[]>([]);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: next } = await fetchDashboard(periodQuery(period));
      setData(next);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: list, meta } = await fetchNotifications({ limit: 20 });
      const unread = Array.isArray(list) ? list.filter((n) => n.isRead !== true) : [];
      setNotifications(unread);
      const count =
        typeof meta?.unreadCount === 'number' ? meta.unreadCount : unread.length;
      patchUnreadState({ notifUnread: count });
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    void loadNotifications();
    const id = window.setInterval(() => void loadNotifications(), NOTIF_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const stats = useMemo(() => (data ? buildOverviewStats(data) : []), [data]);
  const statusBreakdown = useMemo(
    () => (data ? buildStatusBreakdown(data.byStatus) : []),
    [data]
  );
  const visaVolume = useMemo(
    () => (data ? buildVisaTypeVolume(data.byVisaType) : []),
    [data]
  );
  const embassyVolume = useMemo(
    () => (data ? buildEmbassyVolume(data.byEmbassy) : []),
    [data]
  );
  const applicationsTrend = data?.monthlyTrend || [];
  const revenueTrend = useMemo(
    () => (data ? buildRevenueTrend(data.monthlyTrend) : []),
    [data]
  );

  const hasCharts = Boolean(data);

  async function dismissNotification(id: string) {
    setDismissingId(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    decrementNotifUnread(1);
    try {
      await markNotificationRead(id);
    } catch {
      void loadNotifications();
      void refreshUnreadCounts();
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <div
      className="dashboard"
      style={notifications.length > 0 ? undefined : { gridTemplateColumns: '1fr' }}
    >
      <div className="dashboard__main">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">
            Platform overview — applications, embassies, and revenue ({periodLabel(period).toLowerCase()})
          </p>
        </div>
        <select
          className="dashboard__period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          aria-label="Overview period"
        >
          <option value="monthly">This month</option>
          <option value="quarterly">Last 3 months</option>
          <option value="yearly">This year</option>
        </select>
      </header>

      {error ? <div className="dashboard__error">{error}</div> : null}
      {loading && !data ? <p className="dashboard__loading">Loading live metrics…</p> : null}

      <section className="dashboard__stats" aria-label="Key metrics">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      {hasCharts ? (
        <>
          <section className="dashboard__grid dashboard__grid--primary">
            <ChartCard title="Applications & issued visas" subtitle="Monthly volume across the platform">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={applicationsTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b3d2e" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0b3d2e" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillIssued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8b84a" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#e8b84a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6b7c75' }} />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    name="Applications"
                    stroke="#0b3d2e"
                    strokeWidth={2.25}
                    fill="url(#fillApps)"
                  />
                  <Area
                    type="monotone"
                    dataKey="issued"
                    name="Issued"
                    stroke="#e8b84a"
                    strokeWidth={2.25}
                    fill="url(#fillIssued)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status mix" subtitle="Current pipeline by status">
              {statusBreakdown.length === 0 ? (
                <p className="dashboard__chart-empty">No applications yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="78%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 12, color: '#6b7c75' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          <section className="dashboard__grid dashboard__grid--secondary">
            <ChartCard title="By visa type" subtitle="Applications in period">
              {visaVolume.length === 0 ? (
                <p className="dashboard__chart-empty">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visaVolume} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
                    <XAxis dataKey="type" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Applications" fill="#0b3d2e" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="By embassy" subtitle="Routed case volume">
              {embassyVolume.length === 0 ? (
                <p className="dashboard__chart-empty">No embassy routing yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={embassyVolume} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
                    <XAxis dataKey="embassy" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Cases" fill="#e8b84a" radius={[8, 8, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Revenue trend" subtitle="Fee collections ($k)">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a5c45" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1a5c45" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue ($k)"
                    stroke="#1a5c45"
                    strokeWidth={2.25}
                    fill="url(#fillRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        </>
      ) : null}
      </div>

      {notifications.length > 0 ? (
      <aside
        className="dashboard__notifications"
        style={notificationsPanelStyle}
        aria-label="Notifications"
      >
        <div className="dashboard__notifications-head">
          <h2>Notifications</h2>
        </div>
          <ul className="dashboard__notifications-list">
            {notifications.map((notif) => (
              <li key={notif._id} className="dashboard__notification">
                <div className="dashboard__notification-body">
                  <strong>{notif.title || 'Notification'}</strong>
                  {notificationMessage(notif) ? (
                    <p>{notificationMessage(notif)}</p>
                  ) : null}
                  <time dateTime={notif.createdAt || undefined}>
                    {formatNotifTime(notif.createdAt)}
                  </time>
                </div>
                <button
                  type="button"
                  className="dashboard__notification-dismiss"
                  aria-label="Dismiss notification"
                  disabled={dismissingId === notif._id}
                  onClick={() => void dismissNotification(notif._id)}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
      </aside>
      ) : null}
    </div>
  );
}
