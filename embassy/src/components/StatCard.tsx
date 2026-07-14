import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { OverviewStat } from '../api/dashboard';
import './StatCard.css';

type Props = { stat: OverviewStat };

export function StatCard({ stat }: Props) {
  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;

  return (
    <article className="stat-card">
      <p className="stat-card__label">{stat.label}</p>
      <div className="stat-card__row">
        <h3 className="stat-card__value">{stat.value}</h3>
        <span className={`stat-card__delta stat-card__delta--${stat.trend}`}>
          <TrendIcon size={14} strokeWidth={2.25} aria-hidden />
          {stat.delta}
        </span>
      </div>
      <p className="stat-card__hint">{stat.hint}</p>
    </article>
  );
}
