import { Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { ApplicationListItem } from '../api/applications';
import { embassyLabel, formatDate } from '../api/applications';
import { StatusPill } from './StatusPill';
import './DataTable.css';

type Props = {
  rows: ApplicationListItem[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onViewRow?: (id: string) => void;
  onDeleteRow?: (row: ApplicationListItem) => void;
  chatUnreadByAppId?: Record<string, number>;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function DataTable({
  rows,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onViewRow,
  onDeleteRow,
  chatUnreadByAppId,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r._id));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="data-table">
      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              <th className="data-table__check">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all rows"
                />
              </th>
              <th>Applicant</th>
              <th>Visa Type</th>
              <th>Status</th>
              <th>Embassy</th>
              <th>Submitted</th>
              <th>Reference</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedIds.has(row._id);
              const unread = chatUnreadByAppId?.[row._id] || 0;
              return (
                <tr key={row._id} className={selected ? 'is-selected' : undefined}>
                  <td className="data-table__check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(row._id)}
                      aria-label={`Select ${row.personal?.fullName || row.referenceId}`}
                    />
                  </td>
                  <td className="data-table__name">
                    <span className="data-table__name-wrap">
                      {row.personal?.fullName || '—'}
                      {unread > 0 ? (
                        <span className="data-table__unread" aria-label={`${unread} unread messages`}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td>{row.visaTypeCode}</td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                  <td>{embassyLabel(row.embassy)}</td>
                  <td>{formatDate(row.submittedAt || row.createdAt)}</td>
                  <td className="data-table__ref">{row.referenceId}</td>
                  <td className="data-table__actions-col">
                    <button
                      type="button"
                      className="data-table__view"
                      aria-label={`View ${row.personal?.fullName || row.referenceId}`}
                      onClick={() => onViewRow?.(row._id)}
                    >
                      <Eye size={18} strokeWidth={1.75} />
                    </button>
                    {onDeleteRow ? (
                      <button
                        type="button"
                        className="data-table__view data-table__delete"
                        aria-label={`Delete ${row.personal?.fullName || row.referenceId}`}
                        onClick={() => onDeleteRow(row)}
                      >
                        <Trash2 size={18} strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="data-table__footer">
        <div className="data-table__page-size">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="data-table__pager">
          <span>
            {start}-{end} of {totalItems}
          </span>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= maxPage}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
