import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { formatDate } from '../api/applications';
import { deleteEmbassy, listEmbassies, type Embassy } from '../api/embassies';
import { ApiError, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { Modal } from '../components/Modal';
import './Embassies.css';

const POLL_MS = 12000;

type ActiveFilter = 'all' | 'active' | 'inactive';

export function Embassies() {
  const navigate = useNavigate();
  const { staff } = useAuth();
  const canAccess = staffHasPermission(staff, 'embassy:setup');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<Embassy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Embassy | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data, meta } = await listEmbassies({
        page,
        limit: pageSize,
        q: search || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load embassies');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, activeFilter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  async function onConfirmDelete(e: FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteEmbassy(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete embassy');
    } finally {
      setDeleting(false);
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const showDeleteAction = activeFilter === 'inactive';

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="embassies">
      <header className="embassies__header">
        <div className="embassies__titles">
          <h1>Embassies</h1>
          <p>{total} items</p>
        </div>
        <Link to="/embassies/new" className="embassies__create">
          <Plus size={16} strokeWidth={2.5} />
          Create embassy
        </Link>
      </header>

      <div className="embassies__toolbar">
        <label className="embassies__search">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Search by name or code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <div className="embassies__filters" role="group" aria-label="Active filter">
          {(
            [
              ['all', 'All'],
              ['active', 'Active'],
              ['inactive', 'Inactive'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeFilter === value ? 'is-active' : undefined}
              onClick={() => {
                setActiveFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="embassies__error">{error}</div> : null}
      {loading && !rows.length ? <p className="embassies__loading">Loading embassies…</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="embassies__empty">
          <h2>No embassies found</h2>
          <p>Create an embassy to route applications for consular review.</p>
          <Link to="/embassies/new" className="embassies__create">
            <Plus size={16} strokeWidth={2.5} />
            Create embassy
          </Link>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="data-table">
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>City / Country</th>
                  <th>Visa types</th>
                  <th>Active</th>
                  <th>Updated</th>
                  <th
                    className={`data-table__actions-col${
                      showDeleteAction ? ' embassies__actions-col--wide' : ''
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const city = row.contact?.city;
                  const country = row.contact?.country;
                  const location =
                    city && country ? `${city}, ${country}` : city || country || '—';
                  const visas = row.supportedVisaTypeCodes || [];

                  return (
                    <tr key={row._id}>
                      <td>
                        <span className="embassies__code">{row.code}</span>
                      </td>
                      <td className="data-table__name">{row.name}</td>
                      <td>{location}</td>
                      <td>
                        {visas.length === 0 ? (
                          '—'
                        ) : visas.length <= 2 ? (
                          visas.map((code) => (
                            <span key={code} className="embassies__chip">
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="embassies__chip">{visas.length} types</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`embassies__active embassies__active--${
                            row.isActive ? 'yes' : 'no'
                          }`}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(row.updatedAt)}</td>
                      <td
                        className={`data-table__actions-col${
                          showDeleteAction ? ' embassies__actions-col--wide' : ''
                        }`}
                      >
                        <div className="embassies__row-actions">
                          <button
                            type="button"
                            className="data-table__view"
                            aria-label={`View ${row.name}`}
                            onClick={() => navigate(`/embassies/${row._id}`)}
                          >
                            <Eye size={16} />
                          </button>
                          {showDeleteAction && !row.isActive ? (
                            <button
                              type="button"
                              className="data-table__view embassies__delete"
                              aria-label={`Delete ${row.name}`}
                              onClick={() => {
                                setDeleteError('');
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
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
                {[5, 10, 20].map((n) => (
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
        open={Boolean(deleteTarget)}
        title="Delete embassy"
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <form className="modal-form" onSubmit={(e) => void onConfirmDelete(e)}>
          {deleteError ? <div className="modal-form__error">{deleteError}</div> : null}
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)' }}>
            Permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})? This
            cannot be undone.
          </p>
          <div className="modal-form__actions">
            <button
              type="button"
              className="is-ghost"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button type="submit" className="is-danger" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
