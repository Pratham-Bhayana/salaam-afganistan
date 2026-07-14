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
  destination: string;
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
    destination: '',
    email: '',
    password: '',
    phone: '',
    status: 'Active',
  };
}

function SectionAccessGrid({
  sections,
  onToggle,
}: {
  sections: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
}) {
  return (
    <div className="staff-sections">
      {STAFF_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section.key];
        const on = sections[section.key];
        return (
          <label key={section.key} className={`staff-section${on ? ' is-on' : ''}`}>
            <span className="staff-section__icon" aria-hidden>
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span className="staff-section__label">{section.label}</span>
            <input
              type="checkbox"
              checked={on}
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
                />
              </label>
              <label>
                Destination
                <input
                  value={draft.destination}
                  onChange={(e) => onDraftChange({ ...draft, destination: e.target.value })}
                  placeholder="e.g., UAE, UK, Singapore"
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
                />
              </label>
              <label>
                Phone no.
                <input
                  value={draft.phone}
                  onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </label>
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    onDraftChange({ ...draft, status: e.target.value as StaffStatus })
                  }
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
                >
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-form__actions staff-form-actions">
                <button type="button" className="is-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="is-primary">
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
                  <button type="button" onClick={() => onSetAllSections(true)}>
                    Allow All
                  </button>
                  <button type="button" onClick={() => onSetAllSections(false)}>
                    Disallow All
                  </button>
                </div>
              </div>
              <SectionAccessGrid sections={draftSections} onToggle={onToggleSection} />
              <div className="modal-form__actions staff-form-actions">
                <button type="button" className="is-ghost" onClick={() => onSetAddStep(1)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button type="button" className="is-primary" onClick={onCreateStaff}>
                  <Check size={16} />
                  Create Staff
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
            />
          </label>
          <label>
            Destination
            <input
              value={draft.destination}
              onChange={(e) => onDraftChange({ ...draft, destination: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => onDraftChange({ ...draft, email: e.target.value })}
              required
            />
          </label>
          <label>
            Phone no.
            <input
              value={draft.phone}
              onChange={(e) => onDraftChange({ ...draft, phone: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                onDraftChange({ ...draft, status: e.target.value as StaffStatus })
              }
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
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-form__actions staff-form-actions">
            <button type="button" className="is-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="is-primary">
              Save changes
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
                <button type="button" onClick={() => onSetAllSections(true)}>
                  Allow All
                </button>
                <button type="button" onClick={() => onSetAllSections(false)}>
                  Disallow All
                </button>
              </div>
            </div>
            <SectionAccessGrid sections={draftSections} onToggle={onToggleSection} />
            <div className="modal-form__actions staff-form-actions">
              <button type="button" className="is-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="is-primary" onClick={onSaveAccess}>
                <Check size={16} />
                Save Access
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modal === 'delete'} title="Delete Staff Member" onClose={onClose}>
        <p className="staff-delete-copy">
          Deactivate and remove <strong>{activeMember?.fullName}</strong> from the staff list?
          This action can be undone by adding them again later.
        </p>
        <div className="modal-form__actions">
          <button type="button" className="is-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="is-danger" onClick={onConfirmDelete}>
            Delete
          </button>
        </div>
      </Modal>
    </>
  );
}
