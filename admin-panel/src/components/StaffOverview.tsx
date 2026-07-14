import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { STAFF_ROLES, type StaffRole } from '../data/mockStaff';

export type StaffViewMode = 'grid' | 'list';

type Stats = {
  total: number;
  active: number;
  admins: number;
  avg: number;
};

type Props = {
  stats: Stats;
  search: string;
  roleFilter: 'All' | StaffRole;
  view: StaffViewMode;
  selectedCount: number;
  filteredCount: number;
  allSelected: boolean;
  onAdd: () => void;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: 'All' | StaffRole) => void;
  onViewChange: (view: StaffViewMode) => void;
  onToggleSelectAll: () => void;
};

export function StaffOverview({
  stats,
  search,
  roleFilter,
  view,
  selectedCount,
  filteredCount,
  allSelected,
  onAdd,
  onSearchChange,
  onRoleFilterChange,
  onViewChange,
  onToggleSelectAll,
}: Props) {
  return (
    <>
      <header className="staff-page__header">
        <div>
          <h1 className="staff-page__title">Staff & Permissions</h1>
          <p className="staff-page__subtitle">
            Manage admin panel access for staff members with granular section-level control.
          </p>
        </div>
        <button type="button" className="staff-page__add" onClick={onAdd}>
          <Plus size={18} strokeWidth={2.25} />
          Add Staff Member
        </button>
      </header>

      <section className="staff-page__stats" aria-label="Staff metrics">
        <article className="stat-card">
          <p className="stat-card__label">Total Staff</p>
          <h3 className="stat-card__value">{stats.total}</h3>
          <p className="stat-card__hint">All admin panel staff</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Active</p>
          <h3 className="stat-card__value">{stats.active}</h3>
          <p className="stat-card__hint">Currently active</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Admins</p>
          <h3 className="stat-card__value">{stats.admins}</h3>
          <p className="stat-card__hint">Full access role</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Avg Access</p>
          <h3 className="stat-card__value">{stats.avg}%</h3>
          <p className="stat-card__hint">Sections enabled</p>
        </article>
      </section>

      <div className="staff-toolbar">
        <label className="staff-toolbar__search">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search staff by name or email..."
            aria-label="Search staff"
          />
        </label>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as 'All' | StaffRole)}
          aria-label="Filter by role"
        >
          <option value="All">All Roles</option>
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <div className="staff-toolbar__views" role="group" aria-label="View mode">
          <button
            type="button"
            className={view === 'grid' ? 'is-active' : undefined}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={view === 'list' ? 'is-active' : undefined}
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onViewChange('list')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="staff-bulk">
        <label>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            aria-label="Select all staff"
          />
          <span>
            Select All Staff ({selectedCount} of {filteredCount} selected)
          </span>
        </label>
      </div>
    </>
  );
}
