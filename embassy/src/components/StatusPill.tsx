import type { ApplicationStatus } from '../api/applications';
import './StatusPill.css';

const LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  documents_required: 'Docs Required',
  sent_to_embassy: 'New at Mission',
  under_embassy_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  visa_issued: 'Visa Issued',
  closed: 'Closed',
  archived: 'Archived',
};

type Props = {
  status: ApplicationStatus | string;
};

export function StatusPill({ status }: Props) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      {LABELS[status] || status.replaceAll('_', ' ')}
    </span>
  );
}
