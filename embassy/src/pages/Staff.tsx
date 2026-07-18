import { useCallback, useEffect, useMemo, useState } from 'react';
import { StaffOverview, type StaffViewMode } from '../components/StaffOverview';
import { StaffDirectory } from '../components/StaffDirectory';
import {
  StaffModals,
  emptyStaffDraft,
  type StaffDraftAccount,
  type StaffModalMode,
} from '../components/StaffModals';
import {
  emptySections,
  sectionAccessCount,
  STAFF_SECTIONS,
  type SectionKey,
  type StaffMember,
  type StaffRole,
} from '../data/staffMeta';
import {
  ApiError,
  createStaffAPI,
  deleteStaffAPI,
  getAllStaffAPI,
  transformStaff,
  updateStaffAPI,
  updateStaffPermissionsAPI,
} from '../api/staff';
import './Staff.css';

const TOTAL_SECTIONS = STAFF_SECTIONS.length;

export function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | StaffRole>('All');
  const [view, setView] = useState<StaffViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [modal, setModal] = useState<StaffModalMode>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<StaffDraftAccount>(emptyStaffDraft);
  const [draftSections, setDraftSections] = useState(emptySections(false));
  const [draftRole, setDraftRole] = useState<StaffRole>('Embassy Staff');
  const [formError, setFormError] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const { data } = await getAllStaffAPI({ page: 1, limit: 100 });
      setStaff(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadStaff();
  }, [loadStaff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((member) => {
      if (roleFilter !== 'All' && member.role !== roleFilter) return false;
      if (!q) return true;
      return (
        member.fullName.toLowerCase().includes(q) || member.email.toLowerCase().includes(q)
      );
    });
  }, [staff, search, roleFilter]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === 'Active').length;
    const admins = staff.filter((s) => s.role === 'Embassy Admin').length;
    const avg =
      total === 0
        ? 0
        : Math.round(
            (staff.reduce((sum, s) => sum + sectionAccessCount(s.sections), 0) /
              (total * TOTAL_SECTIONS)) *
              100
          );
    return { total, active, admins, avg };
  }, [staff]);

  const activeMember = activeId ? staff.find((s) => s._id === activeId) ?? null : null;
  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s._id));

  function closeModal() {
    if (saving) return;
    setModal(null);
    setActiveId(null);
    setAddStep(1);
    setDraft(emptyStaffDraft());
    setDraftSections(emptySections(false));
    setDraftRole('Embassy Staff');
    setFormError('');
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((s) => next.delete(s._id));
      else filtered.forEach((s) => next.add(s._id));
      return next;
    });
  }

  function openAdd() {
    setDraft(emptyStaffDraft());
    setDraftSections(emptySections(false));
    setDraftRole('Embassy Staff');
    setAddStep(1);
    setFormError('');
    setModal('add');
  }

  function openEdit(member: StaffMember) {
    setActiveId(member._id);
    setDraft({
      fullName: member.fullName,
      designation: member.designation === '—' ? '' : member.designation,
      email: member.email,
      password: '',
      phone: member.phone === '—' ? '' : member.phone,
      status: member.status,
    });
    setDraftRole(member.role);
    setFormError('');
    setModal('edit');
  }

  function openAccess(member: StaffMember) {
    setActiveId(member._id);
    setDraftSections({ ...member.sections });
    setFormError('');
    setModal('access');
  }

  function openDelete(member: StaffMember) {
    setActiveId(member._id);
    setFormError('');
    setModal('delete');
  }

  function validateAccount(requirePassword: boolean) {
    if (!draft.fullName.trim()) return 'Full name is required.';
    if (!draft.email.trim()) return 'Email is required.';
    if (requirePassword && draft.password.trim().length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (!requirePassword && draft.password.trim() && draft.password.trim().length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return '';
  }

  async function createStaff() {
    const validationError = validateAccount(true);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await createStaffAPI({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        password: draft.password,
        role: draftRole,
        phone: draft.phone.trim() || undefined,
        designation: draft.designation.trim() || undefined,
        status: draft.status,
        sections: draftSections,
      });
      closeModal();
      await loadStaff();
      showToast('Staff member created.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!activeId) return;
    const validationError = validateAccount(false);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await updateStaffAPI(activeId, {
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
        designation: draft.designation.trim(),
        role: draftRole,
        status: draft.status,
        password: draft.password.trim() || undefined,
      });
      closeModal();
      await loadStaff();
      showToast('Staff member updated.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update staff member');
    } finally {
      setSaving(false);
    }
  }

  async function saveAccess() {
    if (!activeId) return;

    setSaving(true);
    setFormError('');
    try {
      const { data } = await updateStaffPermissionsAPI(activeId, draftSections);
      const updated = transformStaff(data);
      setStaff((prev) => prev.map((member) => (member._id === activeId ? updated : member)));
      setModal(null);
      setActiveId(null);
      setDraftSections(emptySections(false));
      setFormError('');
      showToast('Section access saved.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save access');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!activeId) return;

    setSaving(true);
    setFormError('');
    try {
      await deleteStaffAPI(activeId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(activeId);
        return next;
      });
      setModal(null);
      setActiveId(null);
      setFormError('');
      await loadStaff();
      showToast('Staff member deactivated.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to delete staff member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="staff-page">
      <StaffOverview
        stats={stats}
        search={search}
        roleFilter={roleFilter}
        view={view}
        selectedCount={selectedIds.size}
        filteredCount={filtered.length}
        allSelected={allSelected}
        onAdd={openAdd}
        onSearchChange={setSearch}
        onRoleFilterChange={setRoleFilter}
        onViewChange={setView}
        onToggleSelectAll={toggleSelectAll}
      />

      {toast ? (
        <div className="staff-page__toast" role="status">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="staff-page__error" role="alert">
          {error}
          <button
            type="button"
            className="staff-page__retry"
            onClick={() => {
              setLoading(true);
              void loadStaff();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      {loading && !staff.length ? <p className="staff-page__loading">Loading staff…</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="staff-page__empty">
          {staff.length === 0
            ? 'No staff members yet. Add your first staff member to get started.'
            : 'No staff members match your filters.'}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <StaffDirectory
          view={view}
          members={filtered}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onManageAccess={openAccess}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      ) : null}

      <StaffModals
        modal={modal}
        addStep={addStep}
        draft={draft}
        draftRole={draftRole}
        draftSections={draftSections}
        formError={formError}
        activeMember={activeMember}
        saving={saving}
        onClose={closeModal}
        onDraftChange={setDraft}
        onDraftRoleChange={setDraftRole}
        onSetAddStep={setAddStep}
        onSetFormError={setFormError}
        onSetAllSections={(enabled) => setDraftSections(emptySections(enabled))}
        onToggleSection={(key: SectionKey) =>
          setDraftSections((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        onValidateAccount={validateAccount}
        onCreateStaff={() => void createStaff()}
        onSaveEdit={() => void saveEdit()}
        onSaveAccess={() => void saveAccess()}
        onConfirmDelete={() => void confirmDelete()}
      />
    </div>
  );
}
