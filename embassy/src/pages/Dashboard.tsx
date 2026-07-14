import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../api/AuthContext';
import { ApiError } from '../api/client';
import {
  buildOverviewStats,
  buildStatusBreakdown,
  buildVisaTypeVolume,
  fetchDashboard,
  periodQuery,
  type DashboardData,
} from '../api/dashboard';
import './Dashboard.css';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(128, 97, 217, 0.12)',
  borderRadius: 12,
  fontSize: 12,
  color: '#16161f',
  boxShadow: '0 8px 24px rgba(22, 22, 31, 0.08)',
};

const POLL_MS = 15000;

type PeriodKey = 'monthly' | 'quarterly' | 'yearly';

export function Dashboard() {
  const { embassy } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

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
  const trend = data?.monthlyTrend || [];
  const staffLoad = data?.staffLoad || [];

  const mission =
    embassy?.code && embassy?.name
      ? `${embassy.name}`
      : embassy?.name || embassy?.code || 'Embassy';

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">
            {mission} overview — inbox, decisions, and staff load
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

      <section className="dashboard__grid dashboard__grid--primary">
        <ChartCard title="Cases received & decisions" subtitle="Last 7 months for this embassy">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8061d9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8061d9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffba38" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ffba38" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(22, 22, 31, 0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6b6b7b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#6b6b7b', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6b6b7b' }} />
              <Area
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="#8061d9"
                strokeWidth={2.25}
                fill="url(#fillReceived)"
              />
              <Area
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke="#ffba38"
                strokeWidth={2.25}
                fill="url(#fillApproved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status mix" subtitle="Current embassy pipeline">
          {statusBreakdown.length === 0 ? (
            <p className="dashboard__empty">No cases in this period.</p>
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
                  wrapperStyle={{ fontSize: 12, color: '#6b6b7b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="dashboard__grid dashboard__grid--secondary">
        <ChartCard title="By visa type" subtitle="Cases in selected period">
          {visaVolume.length === 0 ? (
            <p className="dashboard__empty">No visa-type volume yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visaVolume} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(22, 22, 31, 0.06)" vertical={false} />
                <XAxis
                  dataKey="type"
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  name="Cases"
                  fill="#8061d9"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Staff caseload" subtitle="Active assignments">
          {staffLoad.length === 0 ? (
            <p className="dashboard__empty">No assigned active cases.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffLoad} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(22, 22, 31, 0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6b6b7b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="cases"
                  name="Cases"
                  fill="#ffba38"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
