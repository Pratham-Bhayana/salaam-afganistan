import { Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { ApplicationListItem } from '../api/applications';
import { formatDate, staffLabel } from '../api/applications';
import { StatusPill } from './StatusPill';
import './DataTable.css';

type Props = {
  rows: ApplicationListItem[];
  onViewRow?: (id: string) => void;
  onDeleteRow?: (row: ApplicationListItem) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function DataTable({
  rows,
  onViewRow,
  onDeleteRow,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="data-table">
      <div className="data-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Visa type</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Received</th>
              <th>Reference</th>
              <th className="data-table__actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="data-table__empty">
                  No applications in this view.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id}>
                  <td className="data-table__name">{row.personal?.fullName || '—'}</td>
                  <td>{row.visaTypeCode}</td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                  <td>{staffLabel(row.assignedEmbassyStaff)}</td>
                  <td>{formatDate(row.sentToEmbassyAt || row.submittedAt || row.createdAt)}</td>
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
              ))
            )}
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
