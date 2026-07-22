import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  deleteApplication,
  listApplications,
  type ApplicationListItem,
} from '../api/applications';
import { ApiError } from '../api/client';
import { useUnreadState } from '../layout/unreadStore';
import './Applications.css';

const POLL_MS = 8000;

export function Applications() {
  const navigate = useNavigate();
  const [inbox, setInbox] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const { applicationUnreadByAppId: chatUnreadByAppId } = useUnreadState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ApplicationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: {
        page: number;
        limit: number;
        q?: string;
        status?: string;
        inbox?: 'active';
      } = {
        page,
        limit: pageSize,
        q: search || undefined,
      };

      if (inbox === 'active') params.inbox = 'active';
      else if (inbox !== 'all') params.status = inbox;

      const { data, meta } = await listApplications(params);
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, inbox]);

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
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="applications">
      <PageHeader
        title="Applications"
        itemCount={total}
        search={searchInput}
        inbox={inbox}
        onSearchChange={setSearchInput}
        onInboxChange={(value) => {
          setInbox(value);
          setPage(1);
        }}
      />

      {error ? <div className="applications__error">{error}</div> : null}
      {loading && !rows.length ? (
        <p className="applications__loading">Loading embassy inbox…</p>
      ) : null}

      <DataTable
        rows={rows}
        onViewRow={(id) => navigate(`/applications/${id}`)}
        onDeleteRow={(row) => setDeleteTarget(row)}
        chatUnreadByAppId={chatUnreadByAppId}
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete application"
        message={
          <>
            You are about to permanently delete{' '}
            <strong>{deleteTarget?.referenceId}</strong>
            {deleteTarget?.personal?.fullName ? ` (${deleteTarget.personal.fullName})` : ''} along
            with all its documents, chats, and issued visa. This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            await deleteApplication(deleteTarget._id);
            setDeleteTarget(null);
            await load();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Delete failed');
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
