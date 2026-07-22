import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { formatDate, statusLabel, type ApplicationStatus } from '../api/applications';
import {
  getEmbassy,
  listEmbassyApplications,
  type Embassy,
  type EmbassyApplicationRow,
  type EmbassyStatusCount,
} from '../api/embassies';
import { ApiError, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import { StatusPill } from '../components/StatusPill';
import './EmbassyDetail.css';

const PIPELINE_ORDER = [
  'sent_to_embassy',
  'under_embassy_review',
  'documents_required',
  'approved',
  'rejected',
  'visa_issued',
];

export function EmbassyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { staff } = useAuth();
  const canAccess = staffHasPermission(staff, 'embassy:setup');
  const [embassy, setEmbassy] = useState<Embassy | null>(null);
  const [statusCounts, setStatusCounts] = useState<EmbassyStatusCount[]>([]);
  const [apps, setApps] = useState<EmbassyApplicationRow[]>([]);
  const [appsTotal, setAppsTotal] = useState(0);
  const [appsPage, setAppsPage] = useState(1);
  const [appsPageSize, setAppsPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEmbassy = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getEmbassy(id);
      setEmbassy(data.embassy);
      setStatusCounts(data.statusCounts || []);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load embassy');
      if (err instanceof ApiError && err.status === 404) setEmbassy(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadApps = useCallback(async () => {
    if (!id) return;
    setAppsLoading(true);
    try {
      const { data, meta } = await listEmbassyApplications(id, {
        page: appsPage,
        limit: appsPageSize,
      });
      setApps(data);
      setAppsTotal(Number(meta?.total ?? data.length));
    } catch {
      setApps([]);
      setAppsTotal(0);
    } finally {
      setAppsLoading(false);
    }
  }, [id, appsPage, appsPageSize]);

  useEffect(() => {
    setLoading(true);
    void loadEmbassy();
  }, [loadEmbassy]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  if (!canAccess) return <Navigate to="/" replace />;
  if (!id) return <Navigate to="/embassies" replace />;

  if (!loading && !embassy) {
    return (
      <div className="embassy-detail embassy-detail--simple">
        <p>{error || 'Embassy not found'}</p>
        <Link to="/embassies">Back to embassies</Link>
      </div>
    );
  }

  if (!embassy) {
    return (
      <div className="embassy-detail embassy-detail--simple">
        <p>Loading embassy…</p>
      </div>
    );
  }

  const countMap = new Map(statusCounts.map((s) => [s._id, s.count]));
  const pipeline = PIPELINE_ORDER.map((status) => ({
    status,
    count: countMap.get(status) || 0,
  })).filter((s) => s.count > 0);

  const contact = embassy.contact || {};
  const maxPage = Math.max(1, Math.ceil(appsTotal / appsPageSize) || 1);
  const start = appsTotal === 0 ? 0 : (appsPage - 1) * appsPageSize + 1;
  const end = Math.min(appsPage * appsPageSize, appsTotal);

  return (
    <div className="embassy-detail">
      <nav className="embassy-detail__crumbs" aria-label="Breadcrumb">
        <Link to="/embassies">Embassies</Link>
        <span aria-hidden>/</span>
        <strong>{embassy.name}</strong>
      </nav>

      <div className="embassy-detail__top">
        <div className="embassy-detail__identity">
          <h1>{embassy.name}</h1>
          <div className="embassy-detail__badges">
            <span className="embassy-detail__code">{embassy.code}</span>
            <span
              className={`embassy-detail__active embassy-detail__active--${
                embassy.isActive ? 'yes' : 'no'
              }`}
            >
              {embassy.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <Link to={`/embassies/${embassy._id}/edit`} className="embassy-detail__edit">
          <Pencil size={15} />
          Edit
        </Link>
      </div>

      {error ? <div className="embassy-detail__error">{error}</div> : null}

      <div className="embassy-detail__grid">
        <section className="embassy-detail__section">
          <h2>Contact</h2>
          <dl className="embassy-detail__dl">
            <div>
              <dt>Email</dt>
              <dd>{contact.email || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{contact.phone || '—'}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{contact.city || '—'}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{contact.country || '—'}</dd>
            </div>
            <div className="embassy-detail__span">
              <dt>Address</dt>
              <dd>{contact.address || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="embassy-detail__section">
          <h2>Coverage & notes</h2>
          <div>
            <p>Jurisdiction</p>
            <div className="embassy-detail__chips">
              {(embassy.jurisdictionCountries || []).length === 0 ? (
                <span className="embassy-detail__muted">None set</span>
              ) : (
                (embassy.jurisdictionCountries || []).map((code) => (
                  <span key={code} className="embassy-detail__chip">
                    {code}
                  </span>
                ))
              )}
            </div>
          </div>
          <div>
            <p>Supported visa types</p>
            <div className="embassy-detail__chips">
              {(embassy.supportedVisaTypeCodes || []).length === 0 ? (
                <span className="embassy-detail__muted">None set</span>
              ) : (
                (embassy.supportedVisaTypeCodes || []).map((code) => (
                  <span key={code} className="embassy-detail__chip">
                    {code}
                  </span>
                ))
              )}
            </div>
          </div>
          {embassy.notes ? (
            <div>
              <p>Notes</p>
              <p style={{ color: 'var(--ink)' }}>{embassy.notes}</p>
            </div>
          ) : null}
        </section>
      </div>

      <section className="embassy-detail__section">
        <h2>Pipeline snapshot</h2>
        {pipeline.length === 0 ? (
          <p className="embassy-detail__muted">No routed applications in active pipeline statuses.</p>
        ) : (
          <div className="embassy-detail__pipeline">
            {pipeline.map((item) => (
              <div key={item.status} className="embassy-detail__stat">
                <strong>{item.count}</strong>
                <span>{statusLabel(item.status as ApplicationStatus)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="embassy-detail__section">
        <div className="embassy-detail__apps-head">
          <div>
            <h2>Routed applications</h2>
            <p>{appsTotal} applications assigned to this embassy</p>
          </div>
        </div>

        {appsLoading && !apps.length ? (
          <p className="embassy-detail__muted">Loading applications…</p>
        ) : null}

        {!appsLoading && apps.length === 0 ? (
          <p className="embassy-detail__muted">No applications routed yet.</p>
        ) : null}

        {apps.length > 0 ? (
          <div className="data-table">
            <div className="data-table__scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Applicant</th>
                    <th>Visa type</th>
                    <th>Status</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr
                      key={app._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/applications/${app._id}`)}
                    >
                      <td className="data-table__ref">{app.referenceId}</td>
                      <td className="data-table__name">{app.personal?.fullName || '—'}</td>
                      <td>{app.visaTypeCode}</td>
                      <td>
                        <StatusPill status={app.status} />
                      </td>
                      <td>{formatDate(app.sentToEmbassyAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="data-table__footer">
              <div className="data-table__page-size">
                <span>Rows per page</span>
                <select
                  value={appsPageSize}
                  onChange={(e) => {
                    setAppsPageSize(Number(e.target.value));
                    setAppsPage(1);
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
                  {start}-{end} of {appsTotal}
                </span>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={appsPage <= 1}
                  onClick={() => setAppsPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={appsPage >= maxPage}
                  onClick={() => setAppsPage((p) => Math.min(maxPage, p + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
