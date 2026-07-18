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
import { ApiError, staffHasPermission } from '../api/client';
import { useAuth } from '../api/AuthContext';
import './Applications.css';

const POLL_MS = 8000;

export function Applications() {
  const navigate = useNavigate();
  const { staff } = useAuth();
  const canDelete = staffHasPermission(staff, 'applications:write');
  const [deleteTarget, setDeleteTarget] = useState<ApplicationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('July');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [rows, setRows] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data, meta } = await listApplications({
        page,
        limit: pageSize,
        q: search || undefined,
      });
      setRows(data);
      setTotal(Number(meta?.total ?? data.length));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

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

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allOnPageSelected = rows.every((r) => selectedIds.has(r._id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r._id));
      else rows.forEach((r) => next.add(r._id));
      return next;
    });
  }

  async function onConfirmDelete() {
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
  }

  return (
    <div className="applications">
      <PageHeader
        title="Applications"
        itemCount={total}
        year={year}
        month={month}
        search={searchInput}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onSearchChange={setSearchInput}
      />

      {error ? <div className="applications__error">{error}</div> : null}
      {loading && !rows.length ? <p className="applications__loading">Loading applications…</p> : null}

      <DataTable
        rows={rows}
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onViewRow={(id) => navigate(`/applications/${id}`)}
        onDeleteRow={canDelete ? (row) => setDeleteTarget(row) : undefined}
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
            with all its documents, payments, chats, and issued visa. This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
