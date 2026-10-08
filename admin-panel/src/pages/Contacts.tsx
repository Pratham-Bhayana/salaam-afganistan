import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { staffHasPermission, ApiError } from '../api/client';
import { useAuth } from '../api/AuthContext';
import {
  getContact,
  listContacts,
  updateContactStatus,
  type ContactEnquiry,
  type ContactStatus,
} from '../api/contacts';
import { Modal } from '../components/Modal';
import './Contacts.css';

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Contacts() {
  const { staff } = useAuth();
  const canRead = staffHasPermission(staff, 'contacts:read');

  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<ContactEnquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<ContactEnquiry | null>(null);
  const [detailError, setDetailError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    try {
      const { data, meta } = await listContacts({
        page,
        limit: pageSize,
        status: status || undefined,
        q: query || undefined,
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setNewCount(Number(meta?.newCount ?? 0));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  }, [canRead, page, pageSize, status, query]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  if (!canRead) {
    return <Navigate to="/" replace />;
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  async function openDetail(row: ContactEnquiry) {
    setDetail(row);
    setDetailError('');
    try {
      const { data } = await getContact(row._id);
      setDetail(data);
      setRows((current) => current.map((item) => (item._id === data._id ? data : item)));
      if (row.status === 'new' && data.status !== 'new') {
        setNewCount((count) => Math.max(0, count - 1));
        void load();
      }
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Could not open this message');
    }
  }

  async function changeStatus(next: ContactStatus) {
    if (!detail) return;
    setSaving(true);
    setDetailError('');
    try {
      const { data } = await updateContactStatus(detail._id, next);
      setDetail(data);
      setRows((current) => current.map((item) => (item._id === data._id ? data : item)));
      void load();
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Could not update status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="contacts">
      <header className="contacts__header">
        <h1>Contact</h1>
        <p>
          {total} message{total === 1 ? '' : 's'} from the website
          {newCount ? ` · ${newCount} new` : ''}
        </p>
      </header>

      <div className="contacts__filters">
        <label>
          Search
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Name, email, phone, or subject"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setQueryInput('');
            setQuery('');
            setStatus('');
            setPage(1);
          }}
        >
          Clear
        </button>
      </div>

      {error ? <div className="contacts__error">{error}</div> : null}
      {loading && !rows.length ? <p className="contacts__loading">Loading messages…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="contacts__empty">No contact messages match these filters.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="data-table">
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th className="data-table__actions-col">View</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>{formatWhen(row.createdAt)}</td>
                    <td>
                      <div className="contacts__who">
                        <strong>{row.name}</strong>
                        <span>{row.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="contacts__subject">{row.subject}</span>
                    </td>
                    <td>
                      <span className={`contacts__status contacts__status--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="data-table__actions-col">
                      <button
                        type="button"
                        className="data-table__view"
                        aria-label={`View message from ${row.name}`}
                        onClick={() => void openDetail(row)}
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
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
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
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= maxPage}
                onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={Boolean(detail)}
        title={detail ? detail.subject : 'Contact message'}
        onClose={() => setDetail(null)}
        className="modal--wide"
      >
        {detail ? (
          <div className="contacts__detail">
            <span className={`contacts__status contacts__status--${detail.status}`}>
              {detail.status}
            </span>
            <div className="contacts__meta">
              <div>
                <h3>Name</h3>
                <p>{detail.name}</p>
              </div>
              <div>
                <h3>Email</h3>
                <p>
                  <a href={`mailto:${detail.email}`}>{detail.email}</a>
                </p>
              </div>
              <div>
                <h3>Phone</h3>
                <p>{detail.phone || '—'}</p>
              </div>
              <div>
                <h3>Received</h3>
                <p>{formatWhen(detail.createdAt)}</p>
              </div>
            </div>
            <div className="contacts__message">
              <h3>Message</h3>
              <p>{detail.message}</p>
            </div>
            {detailError ? <div className="contacts__error">{detailError}</div> : null}
            <div className="contacts__actions">
              {detail.status !== 'read' ? (
                <button type="button" disabled={saving} onClick={() => void changeStatus('read')}>
                  Mark as read
                </button>
              ) : null}
              {detail.status === 'archived' ? (
                <button type="button" disabled={saving} onClick={() => void changeStatus('new')}>
                  Move back to new
                </button>
              ) : (
                <button
                  type="button"
                  className="contacts__ghost"
                  disabled={saving}
                  onClick={() => void changeStatus('archived')}
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
