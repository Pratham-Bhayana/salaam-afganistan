import { Shield, Pencil, Trash2 } from 'lucide-react';
import {
  STAFF_SECTIONS,
  initials,
  roleCssModifier,
  sectionAccessCount,
  type StaffMember,
} from '../data/staffMeta';
import type { StaffViewMode } from './StaffOverview';

const TOTAL_SECTIONS = STAFF_SECTIONS.length;

function formatJoined(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatActive(iso: string) {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

type Props = {
  view: StaffViewMode;
  members: StaffMember[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onManageAccess: (member: StaffMember) => void;
  onEdit: (member: StaffMember) => void;
  onDelete: (member: StaffMember) => void;
};

export function StaffDirectory({
  view,
  members,
  selectedIds,
  onToggleSelect,
  onManageAccess,
  onEdit,
  onDelete,
}: Props) {
  if (members.length === 0) {
    return <p className="staff-page__empty">No staff members match your filters.</p>;
  }

  if (view === 'grid') {
    return (
      <div className="staff-grid">
        {members.map((member) => {
          const access = sectionAccessCount(member.sections);
          const selected = selectedIds.has(member._id);
          return (
            <article
              key={member._id}
              className={`staff-card${selected ? ' is-selected' : ''}`}
            >
              <div className="staff-card__top">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelect(member._id)}
                  aria-label={`Select ${member.fullName}`}
                />
                <span className={`staff-role staff-role--${roleCssModifier(member.role)}`}>
                  {member.role}
                </span>
                <span className={`staff-status${member.status === 'Active' ? ' is-active' : ''}`}>
                  <span className="staff-status__dot" aria-hidden />
                  {member.status}
                </span>
              </div>

              <div className="staff-card__identity">
                <span className="staff-avatar" aria-hidden>
                  {initials(member.fullName)}
                </span>
                <div>
                  <h3>{member.fullName}</h3>
                  <p>{member.email}</p>
                </div>
              </div>

              <div className="staff-card__access">
                <div className="staff-card__access-label">
                  <span>Section Access</span>
                  <strong>
                    {access}/{TOTAL_SECTIONS}
                  </strong>
                </div>
                <div className="staff-progress" aria-hidden>
                  <span style={{ width: `${(access / TOTAL_SECTIONS) * 100}%` }} />
                </div>
              </div>

              <div className="staff-card__meta">
                <span>Joined {formatJoined(member.joinedAt)}</span>
                <span>Active {formatActive(member.lastActiveAt)}</span>
              </div>

              <div className="staff-card__actions">
                <button
                  type="button"
                  className="staff-card__manage"
                  onClick={() => onManageAccess(member)}
                >
                  <Shield size={16} strokeWidth={1.75} />
                  Manage Access
                </button>
                <button
                  type="button"
                  className="staff-icon-btn"
                  aria-label={`Edit ${member.fullName}`}
                  onClick={() => onEdit(member)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="staff-icon-btn is-danger"
                  aria-label={`Delete ${member.fullName}`}
                  onClick={() => onDelete(member)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="data-table staff-table">
      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              <th className="data-table__check" />
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access</th>
              <th>Last Active</th>
              <th className="data-table__actions-col staff-table__actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const access = sectionAccessCount(member.sections);
              const selected = selectedIds.has(member._id);
              return (
                <tr key={member._id} className={selected ? 'is-selected' : undefined}>
                  <td className="data-table__check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(member._id)}
                      aria-label={`Select ${member.fullName}`}
                    />
                  </td>
                  <td>
                    <div className="staff-table__name">
                      <strong>{member.fullName}</strong>
                      <span>{member.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`staff-role staff-role--${roleCssModifier(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`staff-status${member.status === 'Active' ? ' is-active' : ''}`}
                    >
                      <span className="staff-status__dot" aria-hidden />
                      {member.status}
                    </span>
                  </td>
                  <td>
                    {access}/{TOTAL_SECTIONS}
                  </td>
                  <td>{formatActive(member.lastActiveAt)}</td>
                  <td className="data-table__actions-col staff-table__actions">
                    <div className="staff-table__action-btns">
                      <button
                        type="button"
                        className="data-table__view"
                        aria-label={`Manage access for ${member.fullName}`}
                        onClick={() => onManageAccess(member)}
                      >
                        <Shield size={18} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="data-table__view"
                        aria-label={`Edit ${member.fullName}`}
                        onClick={() => onEdit(member)}
                      >
                        <Pencil size={18} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="data-table__view is-danger"
                        aria-label={`Delete ${member.fullName}`}
                        onClick={() => onDelete(member)}
                      >
                        <Trash2 size={18} strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
