import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import './ConfirmDialog.css';

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal open={open} title={title} onClose={busy ? () => {} : onCancel} className="confirm-dialog">
      <div className="confirm-dialog__body">
        <span className="confirm-dialog__icon" aria-hidden>
          <AlertTriangle size={22} />
        </span>
        <div className="confirm-dialog__message">{message}</div>
      </div>
      <footer className="confirm-dialog__footer">
        <button type="button" className="confirm-dialog__cancel" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="confirm-dialog__confirm" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}
