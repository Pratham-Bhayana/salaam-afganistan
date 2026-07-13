import { Download, Search } from 'lucide-react';
import './PageHeader.css';

type Props = {
  title: string;
  itemCount: number;
  year: string;
  month: string;
  search: string;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

const YEARS = ['2026', '2025', '2024', '2023'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function PageHeader({
  title,
  itemCount,
  year,
  month,
  search,
  onYearChange,
  onMonthChange,
  onSearchChange,
}: Props) {
  return (
    <header className="page-header">
      <div className="page-header__titles">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__count">{itemCount} items</p>
      </div>

      <div className="page-header__controls">
        <select
          className="page-header__select"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          aria-label="Filter by year"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className="page-header__select"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-label="Filter by month"
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label className="page-header__search">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <button type="button" className="page-header__export" aria-label="Export" title="Export">
          <Download size={18} strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}
