import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  FolderSearch,
  Wallet,
  Building2,
  MessagesSquare,
  Tags,
  LayoutTemplate,
  UserRoundSearch,
  Settings,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from './Modal';
import {
  STAFF_ROLES,
  STAFF_SECTIONS,
  sectionAccessCount,
  type SectionKey,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from '../data/mockStaff';

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  applications: FileText,
  records: FolderSearch,
  finance: Wallet,
  embassies: Building2,
  chat: MessagesSquare,
  fees: Tags,
  templates: LayoutTemplate,
  receptionist: UserRoundSearch,
  settings: Settings,
  audit: ScrollText,
};

const TOTAL_SECTIONS = STAFF_SECTIONS.length;

export type StaffModalMode = 'add' | 'edit' | 'access' | 'delete' | null;

export type StaffDraftAccount = {
  fullName: string;
  designation: string;
  email: string;
  password: string;
  phone: string;
  status: StaffStatus;
};

type Props = {
  modal: StaffModalMode;
  addStep: 1 | 2;
  draft: StaffDraftAccount;
  draftRole: StaffRole;
  draftSections: Record<SectionKey, boolean>;
  formError: string;
  activeMember: StaffMember | null;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (draft: StaffDraftAccount) => void;
  onDraftRoleChange: (role: StaffRole) => void;
  onSetAddStep: (step: 1 | 2) => void;
  onSetFormError: (error: string) => void;
  onSetAllSections: (enabled: boolean) => void;
  onToggleSection: (key: SectionKey) => void;
  onValidateAccount: (requirePassword: boolean) => string;
  onCreateStaff: () => void;
  onSaveEdit: () => void;
  onSaveAccess: () => void;
  onConfirmDelete: () => void;
};

export function emptyStaffDraft(): StaffDraftAccount {
  return {
    fullName: '',
    designation: '',
    email: '',
    password: '',
    phone: '',
    status: 'Active',
  };
}

function SectionAccessGrid({
  sections,
  onToggle,
  disabled,
}: {
  sections: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  disabled?: boolean;
}) {
  return (
    <div className="staff-sections">
      {STAFF_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.key];
        const on = sections[section.key];
        return (
          <label
            key={section.key}
            className={`staff-section${on ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
          >
            <span className="staff-section__icon" aria-hidden>
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span className="staff-section__label">{section.label}</span>
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={() => onToggle(section.key)}
              aria-label={`${section.label} access`}
            />
            <span className="staff-toggle" aria-hidden />
          </label>
        );
      })}
    </div>
  );
}

export function StaffModals({
  modal,
  addStep,
  draft,
  draftRole,
  draftSections,
  formError,
  activeMember,
  saving,
  onClose,
  onDraftChange,
  onDraftRoleChange,
  onSetAddStep,
  onSetFormError,
  onSetAllSections,
  onToggleSection,
  onValidateAccount,
  onCreateStaff,
  onSaveEdit,
  onSaveAccess,
  onConfirmDelete,
}: Props) {
  const enabledCount = sectionAccessCount(draftSections);

  return (
    <>
      <Modal
        open={modal === 'add'}
        title="Add Staff Member"
        onClose={onClose}
        className="modal--wide"
      >
        <div className="staff-wizard">
          <p className="staff-wizard__step">
            Step {addStep} of 2 — {addStep === 1 ? 'Account details' : 'Section access'}
          </p>
          <div className="staff-wizard__progress" aria-hidden>
            <span className={addStep >= 1 ? 'is-done' : undefined} />
            <span className={addStep >= 2 ? 'is-done' : undefined} />
          </div>
          {addStep === 1 ? (
            <p className="staff-wizard__hint">
              Basic profile information for this staff account. You’ll set section access in the
              next step.
            </p>
          ) : null}

          {formError ? <div className="modal-form__error">{formError}</div> : null}

          {addStep === 1 ? (
            <form
              className="modal-form staff-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const error = onValidateAccount(true);
                if (error) {
                  onSetFormError(error);
                  return;
                }
                onSetFormError('');
                onSetAddStep(2);
              }}
            >
              <label>
                Full name
                <input
                  value={draft.fullName}
                  onChange={(e) => onDraftChange({ ...draft, fullName: e.target.value })}
                  placeholder="e.g., Aisha Patel"
                  required
                  disabled={saving}
                />
              </label>
              <label>
                Designation
                <input
                  value={draft.designation}
                  onChange={(e) => onDraftChange({ ...draft, designation: e.target.value })}
                  placeholder="e.g., Senior Case Manager, Visa Officer"
                  disabled={saving}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                  disabled={saving}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={draft.password}
                  onChange={(e) => onDraftChange({ ...draft, password: e.target.value })}
                  placeholder="Create a password"
                  required
                  disabled={saving}
                />
              </label>
              <label>
                Phone no.
                <input
                  value={draft.phone}
                  onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  disabled={saving}
                />
              </label>
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    onDraftChange({ ...draft, status: e.target.value as StaffStatus })
                  }
                  disabled={saving}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label>
                Role
                <select
                  value={draftRole}
                  onChange={(e) => onDraftRoleChange(e.target.value as StaffRole)}
                  disabled={saving}
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-form__actions staff-form-actions">
                <button type="button" className="is-ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="is-primary" disabled={saving}>
                  Next: Permissions
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="staff-access-body">
              <div className="staff-access-head">
                <div>
                  <h3>Section Access</h3>
                  <p>
                    {enabledCount}/{TOTAL_SECTIONS} sections enabled for this staff member
                  </p>
                </div>
                <div className="staff-access-bulk">
                  <button type="button" onClick={() => onSetAllSections(true)} disabled={saving}>
                    Allow All
                  </button>
                  <button type="button" onClick={() => onSetAllSections(false)} disabled={saving}>
                    Disallow All
                  </button>
                </div>
              </div>
              <SectionAccessGrid
                sections={draftSections}
                onToggle={onToggleSection}
                disabled={saving}
              />
              <div className="modal-form__actions staff-form-actions">
                <button
                  type="button"
                  className="is-ghost"
                  onClick={() => onSetAddStep(1)}
                  disabled={saving}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="is-primary"
                  onClick={onCreateStaff}
                  disabled={saving}
                >
                  <Check size={16} />
                  {saving ? 'Creating…' : 'Create Staff'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={modal === 'edit'}
        title="Edit Staff Member"
        onClose={onClose}
        className="modal--wide"
      >
        {formError ? <div className="modal-form__error">{formError}</div> : null}
        <form
          className="modal-form staff-form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveEdit();
          }}
        >
          <label>
            Full name
            <input
              value={draft.fullName}
              onChange={(e) => onDraftChange({ ...draft, fullName: e.target.value })}
              required
              disabled={saving}
            />
          </label>
          <label>
            Designation
            <input
              value={draft.designation}
              onChange={(e) => onDraftChange({ ...draft, designation: e.target.value })}
              placeholder="e.g., Senior Case Manager, Visa Officer"
              disabled={saving}
            />
          </label>
          <label>
            Email
            <input type="email" value={draft.email} readOnly disabled title="Email cannot be changed" />
          </label>
          <label>
            New password
            <input
              type="password"
              value={draft.password}
              onChange={(e) => onDraftChange({ ...draft, password: e.target.value })}
              placeholder="Leave blank to keep current"
              disabled={saving}
            />
          </label>
          <label>
            Phone no.
            <input
              value={draft.phone}
              onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
              disabled={saving}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                onDraftChange({ ...draft, status: e.target.value as StaffStatus })
              }
              disabled={saving}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label>
            Role
            <select
              value={draftRole}
              onChange={(e) => onDraftRoleChange(e.target.value as StaffRole)}
              disabled={saving}
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-form__actions staff-form-actions">
            <button type="button" className="is-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="is-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modal === 'access'}
        title="Manage Access"
        onClose={onClose}
        className="modal--wide"
      >
        {formError ? <div className="modal-form__error">{formError}</div> : null}
        {activeMember ? (
          <div className="staff-access-body">
            <p className="staff-access-context">
              {activeMember.fullName} — {activeMember.email}
            </p>
            <div className="staff-access-head">
              <div>
                <h3>Section Access</h3>
                <p>
                  {enabledCount}/{TOTAL_SECTIONS} sections enabled
                </p>
              </div>
              <div className="staff-access-bulk">
                <button type="button" onClick={() => onSetAllSections(true)} disabled={saving}>
                  Allow All
                </button>
                <button type="button" onClick={() => onSetAllSections(false)} disabled={saving}>
                  Disallow All
                </button>
              </div>
            </div>
            <SectionAccessGrid
              sections={draftSections}
              onToggle={onToggleSection}
              disabled={saving}
            />
            <div className="modal-form__actions staff-form-actions">
              <button type="button" className="is-ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="is-primary" onClick={onSaveAccess} disabled={saving}>
                <Check size={16} />
                {saving ? 'Saving…' : 'Save Access'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modal === 'delete'} title="Delete Staff Member" onClose={onClose}>
        {formError ? <div className="modal-form__error">{formError}</div> : null}
        <p className="staff-delete-copy">
          Deactivate and remove <strong>{activeMember?.fullName}</strong> from the staff list?
          This action can be undone by adding them again later.
        </p>
        <div className="modal-form__actions">
          <button type="button" className="is-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="is-danger" onClick={onConfirmDelete} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </>
  );
}
