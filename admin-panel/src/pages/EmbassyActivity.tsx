import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { staffHasPermission, ApiError } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { formatDate } from '../api/applications';
import {
  actionLabel,
  activityStaffName,
  embassyName,
  EMBASSY_ACTIONS,
  listActivityEmbassies,
  listEmbassyActivity,
  type EmbassyActivityLog,
  type EmbassyRef,
} from '../api/embassyActivity';
import { Modal } from '../components/Modal';
import './AuditLogs.css';

function pretty(value: unknown) {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function EmbassyActivity() {
  const { staff } = useAuth();
  const canRead = staffHasPermission(staff, 'audit:read');
  const [searchParams, setSearchParams] = useSearchParams();

  const [embassy, setEmbassy] = useState(searchParams.get('embassy') || '');
  const [action, setAction] = useState(searchParams.get('action') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<EmbassyActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<EmbassyActivityLog | null>(null);
  const [embassies, setEmbassies] = useState<EmbassyRef[]>([]);

  useEffect(() => {
    if (!canRead) return;
    void listActivityEmbassies()
      .then(({ data }) => setEmbassies(data))
      .catch(() => setEmbassies([]));
  }, [canRead]);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    try {
      const { data, meta } = await listEmbassyActivity({
        page,
        limit: pageSize,
        embassy: embassy || undefined,
        action: action || undefined,
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load embassy activity');
    } finally {
      setLoading(false);
    }
  }, [canRead, page, pageSize, embassy, action]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (embassy) next.set('embassy', embassy);
    if (action) next.set('action', action);
    setSearchParams(next, { replace: true });
  }, [embassy, action, setSearchParams]);

  if (!canRead) {
    return (
      <div className="audit-logs">
        <header className="audit-logs__header">
          <h1>Embassy activity</h1>
          <p>Embassy panel action history</p>
        </header>
        <div className="audit-logs__locked">
          <h2>Access restricted</h2>
          <p>
            You need the <code>audit:read</code> permission to view embassy activity.
          </p>
        </div>
      </div>
    );
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function clearFilters() {
    setEmbassy('');
    setAction('');
    setPage(1);
  }

  return (
    <div className="audit-logs">
      <header className="audit-logs__header">
        <h1>Embassy activity</h1>
        <p>{total} recorded embassy actions</p>
      </header>

      <div className="audit-logs__filters">
        <label>
          Embassy
          <select
            value={embassy}
            onChange={(e) => {
              setEmbassy(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All embassies</option>
            {embassies.map((emb) => (
              <option key={emb._id} value={emb._id}>
                {emb.name || emb.code} {emb.code ? `(${emb.code})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Action
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {EMBASSY_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={clearFilters}>
          Clear
        </button>
      </div>

      {error ? <div className="audit-logs__error">{error}</div> : null}
      {loading && !rows.length ? (
        <p className="audit-logs__loading">Loading embassy activity…</p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="audit-logs__empty">No embassy activity matches these filters.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="data-table">
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Embassy</th>
                  <th>Staff</th>
                  <th>Action</th>
                  <th>Application</th>
                  <th>IP</th>
                  <th className="data-table__actions-col">View</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const app = typeof row.application === 'object' ? row.application : null;
                  const staffObj = typeof row.embassyStaff === 'object' ? row.embassyStaff : null;
                  return (
                    <tr key={row._id}>
                      <td>{formatDate(row.createdAt)}</td>
                      <td>{embassyName(row.embassy)}</td>
                      <td>
                        <div className="audit-logs__resource">
                          <strong>{activityStaffName(row.embassyStaff)}</strong>
                          <code>{staffObj?.role?.replaceAll('_', ' ') || '—'}</code>
                        </div>
                      </td>
                      <td>
                        <span className="audit-logs__action">{actionLabel(row.action)}</span>
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
          <div className="data-table__footer">
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(detail)}
        title={detail ? actionLabel(detail.action) : 'Activity detail'}
        onClose={() => setDetail(null)}
        className="modal--wide"
      >
        {detail ? (
          <div className="audit-logs__json">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
              {formatDate(detail.createdAt)} · {embassyName(detail.embassy)} ·{' '}
              {activityStaffName(detail.embassyStaff)}
            </p>
            <div>
              <h3>Action</h3>
              <pre>
                {detail.action}
                {detail.resourceType ? ` · ${detail.resourceType}` : ''}
                {detail.resourceId ? ` · ${detail.resourceId}` : ''}
              </pre>
            </div>
            <div>
              <h3>IP address</h3>
              <pre>{detail.ip || 'Not captured'}</pre>
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
