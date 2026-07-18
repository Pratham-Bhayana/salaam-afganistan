import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import {
  ApiError,
  EMBASSY_PERMISSIONS,
  embassyHasPermission,
} from '../api/client';
import { useAuth } from '../api/AuthContext';
import {
  actionLabel,
  formatActivityDate,
  listEmbassyActivity,
  staffName,
  type EmbassyActivityLog,
} from '../api/activity';
import { Modal } from '../components/Modal';
import '../components/DataTable.css';
import './ActivityLogs.css';

const ACTION_FILTERS = [
  '',
  'login',
  'application.view',
  'application.decide',
  'application.assign',
  'application.note',
  'application.delete',
  'visa.issue',
  'document.view',
  'chat.message',
  'staff.create',
  'staff.update',
  'staff.deactivate',
];

function pretty(value: unknown) {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ActivityLogs() {
  const { staff: me } = useAuth();
  const canRead = embassyHasPermission(me, EMBASSY_PERMISSIONS.ACTIVITY_READ);

  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<EmbassyActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<EmbassyActivityLog | null>(null);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, meta } = await listEmbassyActivity({
        page,
        limit: pageSize,
        action: action || undefined,
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load activity logs');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, pageSize, action]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Client-side filter over the current page by staff name / reference.
  const visibleRows = search
    ? rows.filter((r) => {
        const hay = [
          staffName(r.embassyStaff),
          actionLabel(r.action),
          r.action,
          typeof r.application === 'object' ? r.application?.referenceId : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      })
    : rows;

  if (!canRead) {
    return (
      <div className="applications activity-page">
        <header className="records-header">
          <div className="records-header__titles">
            <h1>Activity logs</h1>
            <p>Embassy actions</p>
          </div>
        </header>
        <div className="staff-locked">
          <h2>Access restricted</h2>
          <p>You need the embassy activity permission to view this page.</p>
        </div>
      </div>
    );
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="applications activity-page">
      <header className="records-header">
        <div className="records-header__titles">
          <h1>Activity logs</h1>
          <p>{total} recorded actions</p>
        </div>
        <div className="records-header__controls">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Action"
          >
            {ACTION_FILTERS.map((a) => (
              <option key={a || 'all'} value={a}>
                {a ? actionLabel(a) : 'All actions'}
              </option>
            ))}
          </select>
          <label className="records-header__search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Filter by staff, reference…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
        </div>
      </header>

      <p className="records-note">
        Every action performed in this embassy panel is recorded here and mirrored to the platform
        administrators.
      </p>

      {error ? <div className="applications__error">{error}</div> : null}
      {loading && !rows.length ? <p className="applications__loading">Loading activity…</p> : null}

      <div className="data-table">
        <div className="data-table__scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Staff</th>
                <th>Action</th>
                <th>Application</th>
                <th>IP</th>
                <th className="data-table__actions-col">View</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="records-empty">
                    No activity for this filter.
                  </td>
                </tr>
              ) : null}
              {visibleRows.map((row) => {
                const app = typeof row.application === 'object' ? row.application : null;
                const staffObj = typeof row.embassyStaff === 'object' ? row.embassyStaff : null;
                return (
                  <tr key={row._id}>
                    <td>{formatActivityDate(row.createdAt)}</td>
                    <td className="data-table__name">
                      <div className="activity-staff">
                        <strong>{staffName(row.embassyStaff)}</strong>
                        {staffObj?.role ? (
                          <span>{staffObj.role.replaceAll('_', ' ')}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="activity-action">{actionLabel(row.action)}</span>
                    </td>
                    <td>{app?.referenceId || '—'}</td>
                    <td>{row.ip || '—'}</td>
                    <td className="data-table__actions-col">
                      <button
                        type="button"
                        className="data-table__view"
                        aria-label="View activity detail"
                        onClick={() => setDetail(row)}
                      >
                        <Eye size={16} />
                      </button>
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
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="data-table__pager">
            <span>
              {start}-{end} of {total}
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= maxPage}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>

      <Modal
        open={Boolean(detail)}
        title={detail ? actionLabel(detail.action) : 'Activity detail'}
        onClose={() => setDetail(null)}
        className="activity-modal"
      >
        {detail ? (
          <div className="activity-detail">
            <div className="activity-detail__meta">
              <div>
                <span>When</span>
                <strong>{formatActivityDate(detail.createdAt)}</strong>
              </div>
              <div>
                <span>Staff</span>
                <strong>{staffName(detail.embassyStaff)}</strong>
              </div>
              <div>
                <span>Action code</span>
                <strong>{detail.action}</strong>
              </div>
              <div>
                <span>Resource</span>
                <strong>
                  {detail.resourceType || '—'}
                  {detail.resourceId ? ` · ${detail.resourceId}` : ''}
                </strong>
              </div>
              <div>
                <span>IP address</span>
                <strong>{detail.ip || 'Not captured'}</strong>
              </div>
            </div>
            <div>
              <h3>Device / browser</h3>
              <pre>{detail.userAgent || 'Not captured'}</pre>
            </div>
            <div>
              <h3>Details</h3>
              <pre>{pretty(detail.meta)}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
