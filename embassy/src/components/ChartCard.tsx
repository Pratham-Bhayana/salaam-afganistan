import type { ReactNode } from 'react';
import './ChartCard.css';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ChartCard({ title, subtitle, children }: Props) {
  return (
    <section className="chart-card">
      <header className="chart-card__header">
        <h2 className="chart-card__title">{title}</h2>
        {subtitle ? <p className="chart-card__subtitle">{subtitle}</p> : null}
      </header>
      <div className="chart-card__body">{children}</div>
    </section>
  );
}
