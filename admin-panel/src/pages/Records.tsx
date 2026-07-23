import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Eye, Search } from 'lucide-react';
import {
  decisionLabel,
  exportDecisionRecords,
  formatRecordDate,
  listDecisionRecords,
  type DecisionRecord,
  type RecordsQuery,
} from '../api/records';
import { ApiError, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import '../components/DataTable.css';
import './Records.css';

type Period = RecordsQuery['period'];

export function Records() {
  const { staff } = useAuth();
  const canAccess = staffHasPermission(staff, 'records:export');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [decision, setDecision] = useState<'' | 'approved' | 'rejected'>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<DecisionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: RecordsQuery = {
        page,
        limit: pageSize,
        q: search || undefined,
        period,
        decision: decision || undefined,
      };
      if (period === 'custom') {
        if (from) params.from = new Date(from).toISOString();
        if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();
      }
      const { data, meta } = await listDecisionRecords(params);
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load records');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, period, from, to, decision]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  async function onExport() {
    setExporting(true);
    setError('');
    try {
      const params: RecordsQuery = {
        q: search || undefined,
        period,
        decision: decision || undefined,
      };
      if (period === 'custom') {
        if (from) params.from = new Date(from).toISOString();
        if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();
      }
      const blob = await exportDecisionRecords(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-records-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="applications records-page">
      <header className="records-header">
        <div className="records-header__titles">
          <h1>Records</h1>
          <p>{total} decision cases</p>
        </div>
        <div className="records-header__controls">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as Period);
              setPage(1);
            }}
            aria-label="Period"
          >
            <option value="all">All time</option>
            <option value="monthly">This month</option>
            <option value="quarterly">This quarter</option>
            <option value="yearly">This year</option>
            <option value="custom">Custom range</option>
          </select>

          {period === 'custom' ? (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                aria-label="From date"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                aria-label="To date"
              />
            </>
          ) : null}

          <select
            value={decision}
            onChange={(e) => {
              setDecision(e.target.value as '' | 'approved' | 'rejected');
              setPage(1);
            }}
            aria-label="Decision"
          >
            <option value="">All decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <label className="records-header__search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search reference, name, passport…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="records-header__export"
            onClick={() => void onExport()}
            disabled={exporting}
            title="Export CSV"
          >
            <Download size={18} />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </header>

      {error ? <div className="applications__error">{error}</div> : null}
      {loading && !rows.length ? (
        <p className="applications__loading">Loading decision records…</p>
      ) : null}

      <div className="data-table">
        <div className="data-table__scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Applicant</th>
                <th>Decision</th>
                <th>Decided by</th>
                <th>Visa type</th>
                <th>Passport</th>
                <th>Decided</th>
                <th>Visa no.</th>
                <th className="data-table__actions-col records-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="records-empty">
                    No approved or rejected cases for this filter.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="data-table__ref">{row.referenceId}</td>
                  <td className="data-table__name">{row.applicantName}</td>
                  <td>
                    <span
                      className={`records-pill records-pill--${
                        row.decisionStatus === 'rejected' ? 'rejected' : 'approved'
                      }`}
                    >
                      {decisionLabel(row.decisionStatus)}
                    </span>
                  </td>
                  <td className="records-decider" title={row.decidedByTitle}>
                    {row.decidedByTitle}
                  </td>
                  <td>{row.visaTypeCode || '—'}</td>
                  <td>{row.passportNumber || '—'}</td>
                  <td>{formatRecordDate(row.decidedAt)}</td>
                  <td>{row.visaNumber || '—'}</td>
                  <td className="data-table__actions-col records-table__actions-col">
                    <div className="records-table__actions">
                      <Link
                        to={`/applications/${row._id}`}
                        className="data-table__view"
                        aria-label={`View ${row.referenceId}`}
                      >
                        <Eye size={18} strokeWidth={1.75} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
