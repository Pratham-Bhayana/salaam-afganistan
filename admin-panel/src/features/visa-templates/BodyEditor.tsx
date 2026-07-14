import { GripVertical, QrCode } from 'lucide-react';
import { useState } from 'react';
import type { TemplatePlaceholder, VisaTemplate } from './types';

type Props = {
  body: VisaTemplate['body'];
  accentColor: string;
  fontSize: number;
  previewMode?: boolean;
  onChange: (next: VisaTemplate['body']) => void;
};

export function BodyEditor({ body, accentColor, fontSize, previewMode, onChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const list = [...body.placeholders];
    const from = list.findIndex((p) => p.id === fromId);
    const to = list.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    onChange({ ...body, placeholders: list });
  }

  function onDragStart(id: string) {
    setDragId(id);
  }

  function onDrop(target: TemplatePlaceholder) {
    if (dragId) reorder(dragId, target.id);
    setDragId(null);
  }

  return (
    <section id="vt-section-body" className="vt-section" data-section="body">
      <div className="vt-section__label">Body</div>
      <div className="vt-a4-body">
        <p className="vt-a4-body-hint" style={{ fontSize: fontSize - 1 }}>
          {previewMode
            ? 'Applicant details will render into these fields.'
            : 'Drag chips to reorder dynamic placeholders.'}
        </p>
        <ul className="vt-chips">
          {body.placeholders.map((ph) => (
            <li key={ph.id}>
              <button
                type="button"
                className={`vt-chip${dragId === ph.id ? ' is-dragging' : ''}`}
                style={{ borderColor: accentColor, color: accentColor, fontSize }}
                draggable={!previewMode}
                onDragStart={() => onDragStart(ph.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={()  => onDrop(ph)}
                onDragEnd={() => setDragId(null)}
              >
                {!previewMode ? <GripVertical size={14} aria-hidden /> : null}
                {ph.label}
              </button>
            </li>
          ))}
        </ul>

        {body.showQr ? (
          <div className="vt-qr" style={{ borderColor: accentColor }}>
            <QrCode size={28} strokeWidth={1.5} style={{ color: accentColor }} />
            <span style={{ fontSize: fontSize - 2 }}>QR / barcode</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
