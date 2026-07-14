import { useMemo, useState } from 'react';
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
  mockStaff,
  sectionAccessCount,
  STAFF_SECTIONS,
  type SectionKey,
  type StaffMember,
  type StaffRole,
} from '../data/mockStaff';
import './Staff.css';

const TOTAL_SECTIONS = STAFF_SECTIONS.length;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | StaffRole>('All');
  const [view, setView] = useState<StaffViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [modal, setModal] = useState<StaffModalMode>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<StaffDraftAccount>(emptyStaffDraft);
  const [draftSections, setDraftSections] = useState(emptySections(false));
  const [draftRole, setDraftRole] = useState<StaffRole>('Coordinator');
  const [formError, setFormError] = useState('');

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
    const admins = staff.filter((s) => s.role === 'Admin').length;
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
    setModal(null);
    setActiveId(null);
    setAddStep(1);
    setDraft(emptyStaffDraft());
    setDraftSections(emptySections(false));
    setDraftRole('Coordinator');
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
    setDraftRole('Coordinator');
    setAddStep(1);
    setFormError('');
    setModal('add');
  }

  function openEdit(member: StaffMember) {
    setActiveId(member._id);
    setDraft({
      fullName: member.fullName,
      destination: member.destination,
      email: member.email,
      password: '',
      phone: member.phone,
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
    setModal('delete');
  }

  function validateAccount(requirePassword: boolean) {
    if (!draft.fullName.trim()) return 'Full name is required.';
    if (!draft.email.trim()) return 'Email is required.';
    if (requirePassword && draft.password.trim().length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return '';
  }

  function createStaff() {
    const names = draft.fullName.trim().split(/\s+/);
    const member: StaffMember = {
      _id: String(Date.now()),
      fullName: draft.fullName.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim() || '—',
      destination: draft.destination.trim() || '—',
      role: draftRole,
      status: draft.status,
      joinedAt: todayIso(),
      lastActiveAt: todayIso(),
      sections: { ...draftSections },
    };
    if (names.length === 1 && !member.fullName) return;
    setStaff((prev) => [member, ...prev]);
    closeModal();
  }

  function saveEdit() {
    if (!activeId) return;
    const error = validateAccount(false);
    if (error) {
      setFormError(error);
      return;
    }
    setStaff((prev) =>
      prev.map((member) =>
        member._id === activeId
          ? {
              ...member,
              fullName: draft.fullName.trim(),
              destination: draft.destination.trim() || '—',
              email: draft.email.trim().toLowerCase(),
              phone: draft.phone.trim() || '—',
              status: draft.status,
              role: draftRole,
            }
          : member
      )
    );
    closeModal();
  }

  function saveAccess() {
    if (!activeId) return;
    setStaff((prev) =>
      prev.map((member) =>
        member._id === activeId ? { ...member, sections: { ...draftSections } } : member
      )
    );
    closeModal();
  }

  function confirmDelete() {
    if (!activeId) return;
    setStaff((prev) => prev.filter((member) => member._id !== activeId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
    closeModal();
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

      <StaffDirectory
        view={view}
        members={filtered}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onManageAccess={openAccess}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      <StaffModals
        modal={modal}
        addStep={addStep}
        draft={draft}
        draftRole={draftRole}
        draftSections={draftSections}
        formError={formError}
        activeMember={activeMember}
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
        onCreateStaff={createStaff}
        onSaveEdit={saveEdit}
        onSaveAccess={saveAccess}
        onConfirmDelete={confirmDelete}
      />
    </div>
  );
}
