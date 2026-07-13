import { useState } from 'react';
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
import {
  APPLICATIONS_TREND,
  EMBASSY_VOLUME,
  OVERVIEW_STATS,
  REVENUE_TREND,
  STATUS_BREAKDOWN,
  VISA_TYPE_VOLUME,
} from '../data/mockDashboard';
import './Dashboard.css';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid rgba(26, 46, 40, 0.08)',
  borderRadius: 10,
  fontSize: 12,
  color: '#1a2e28',
  boxShadow: '0 8px 24px rgba(26, 46, 40, 0.08)',
};

export function Dashboard() {
  const [period, setPeriod] = useState('This month');

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">Platform overview — applications, embassies, and revenue</p>
        </div>
        <select
          className="dashboard__period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Overview period"
        >
          <option>This month</option>
          <option>Last 3 months</option>
          <option>This year</option>
        </select>
      </header>

      <section className="dashboard__stats" aria-label="Key metrics">
        {OVERVIEW_STATS.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      <section className="dashboard__grid dashboard__grid--primary">
        <ChartCard title="Applications & issued visas" subtitle="Monthly volume across the platform">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={APPLICATIONS_TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={STATUS_BREAKDOWN}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="78%"
                paddingAngle={3}
                stroke="none"
              >
                {STATUS_BREAKDOWN.map((entry) => (
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
        </ChartCard>
      </section>

      <section className="dashboard__grid dashboard__grid--secondary">
        <ChartCard title="By visa type" subtitle="Submitted applications">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={VISA_TYPE_VOLUME} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
              <XAxis dataKey="type" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Applications" fill="#0b3d2e" radius={[8, 8, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By embassy" subtitle="Routed case volume">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={EMBASSY_VOLUME} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(26, 46, 40, 0.06)" vertical={false} />
              <XAxis dataKey="embassy" tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7c75', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Cases" fill="#e8b84a" radius={[8, 8, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue trend" subtitle="Fee collections ($k)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE_TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
    </div>
  );
}
