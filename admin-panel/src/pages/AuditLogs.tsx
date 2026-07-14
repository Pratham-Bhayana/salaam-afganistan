import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { staffHasPermission, ApiError } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { formatDate } from '../api/applications';
import { listAuditLogs, type AuditLog } from '../api/auditLogs';
import { Modal } from '../components/Modal';
import './AuditLogs.css';

const RESOURCE_TYPES = [
  '',
  'PlatformSettings',
  'EmailTemplate',
  'Embassy',
  'Application',
  'Staff',
  'ChatRoom',
  'IssuedVisa',
];

function pretty(value: unknown) {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditLogs() {
  const { staff } = useAuth();
  const canRead = staffHasPermission(staff, 'audit:read');
  const [searchParams, setSearchParams] = useSearchParams();

  const [actionInput, setActionInput] = useState(searchParams.get('action') || '');
  const [action, setAction] = useState(searchParams.get('action') || '');
  const [resourceType, setResourceType] = useState(searchParams.get('resourceType') || '');
  const [resourceIdInput, setResourceIdInput] = useState(searchParams.get('resourceId') || '');
  const [resourceId, setResourceId] = useState(searchParams.get('resourceId') || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    try {
      const { data, meta } = await listAuditLogs({
        page,
        limit: pageSize,
        action: action || undefined,
        resourceType: resourceType || undefined,
        resourceId: resourceId || undefined,
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [canRead, page, pageSize, action, resourceType, resourceId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAction(actionInput.trim());
      setPage(1);
      const next = new URLSearchParams();
      if (actionInput.trim()) next.set('action', actionInput.trim());
      if (resourceType) next.set('resourceType', resourceType);
      if (resourceIdInput.trim()) next.set('resourceId', resourceIdInput.trim());
      setSearchParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [actionInput, resourceType, resourceIdInput, setSearchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setResourceId(resourceIdInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [resourceIdInput]);

  if (!canRead) {
    return (
      <div className="audit-logs">
        <header className="audit-logs__header">
          <h1>Audit logs</h1>
          <p>Platform activity history</p>
        </header>
        <div className="audit-logs__locked">
          <h2>Access restricted</h2>
          <p>
            You need the <code>audit:read</code> permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function clearFilters() {
    setActionInput('');
    setAction('');
    setResourceType('');
    setResourceIdInput('');
    setResourceId('');
    setPage(1);
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="audit-logs">
      <header className="audit-logs__header">
        <h1>Audit logs</h1>
        <p>{total} items</p>
      </header>

      <div className="audit-logs__filters">
        <label>
          Action
          <input
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            placeholder="e.g. settings.update"
          />
        </label>
        <label>
          Resource type
          <select
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type || 'all'} value={type}>
                {type || 'All types'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resource ID
          <input
            value={resourceIdInput}
            onChange={(e) => setResourceIdInput(e.target.value)}
            placeholder="Object id"
          />
        </label>
        <button type="button" onClick={clearFilters}>
          Clear
        </button>
      </div>

      {error ? <div className="audit-logs__error">{error}</div> : null}
      {loading && !rows.length ? <p className="audit-logs__loading">Loading audit logs…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="audit-logs__empty">No audit log entries match these filters.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="data-table">
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>IP</th>
                  <th className="data-table__actions-col">View</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      <span className="audit-logs__action">{row.action}</span>
                    </td>
                    <td>
                      <div className="audit-logs__resource">
                        <strong>{row.resourceType}</strong>
                        {row.resourceId ? <code>{row.resourceId}</code> : null}
                      </div>
                    </td>
                    <td>
                      <div className="audit-logs__resource">
                        <strong>{row.actorEmail || row.actorType}</strong>
                        <code>
                          {[row.actorRole, row.actorType].filter(Boolean).join(' · ') || '—'}
                        </code>
                      </div>
                    </td>
                    <td>{row.ip || '—'}</td>
                    <td className="data-table__actions-col">
                      <button
                        type="button"
                        className="data-table__view"
                        aria-label="View audit detail"
                        onClick={() => setDetail(row)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
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
                {[5, 10, 20, 50].map((n) => (
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
        title={detail ? detail.action : 'Audit detail'}
        onClose={() => setDetail(null)}
        className="modal--wide"
      >
        {detail ? (
          <div className="audit-logs__json">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
              {formatDate(detail.createdAt)} · {detail.resourceType}
              {detail.resourceId ? ` · ${detail.resourceId}` : ''} ·{' '}
              {detail.actorEmail || detail.actorType}
            </p>
            <div>
              <h3>Before</h3>
              <pre>{pretty(detail.before)}</pre>
            </div>
            <div>
              <h3>After</h3>
              <pre>{pretty(detail.after)}</pre>
            </div>
            <div>
              <h3>Meta</h3>
              <pre>{pretty(detail.meta)}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
