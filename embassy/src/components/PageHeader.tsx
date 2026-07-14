import { Search } from 'lucide-react';
import './PageHeader.css';

type InboxFilter = 'active' | 'all' | string;

type Props = {
  title: string;
  itemCount: number;
  search: string;
  inbox: InboxFilter;
  onSearchChange: (value: string) => void;
  onInboxChange: (value: InboxFilter) => void;
};

const INBOX_OPTIONS: { value: InboxFilter; label: string }[] = [
  { value: 'active', label: 'Active inbox' },
  { value: 'all', label: 'All cases' },
  { value: 'sent_to_embassy', label: 'New at mission' },
  { value: 'under_embassy_review', label: 'Under review' },
  { value: 'documents_required', label: 'Docs required' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function PageHeader({
  title,
  itemCount,
  search,
  inbox,
  onSearchChange,
  onInboxChange,
}: Props) {
  return (
    <header className="page-header">
      <div className="page-header__titles">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__count">{itemCount} cases</p>
      </div>

      <div className="page-header__controls">
        <select
          className="page-header__select"
          value={inbox}
          onChange={(e) => onInboxChange(e.target.value)}
          aria-label="Filter inbox"
        >
          {INBOX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="page-header__search">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Search name, email, reference…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
      </div>
    </header>
  );
}
