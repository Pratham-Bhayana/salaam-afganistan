import { GripVertical, User } from 'lucide-react';
import { useState } from 'react';
import {
  DEFAULT_WATERMARK,
  PREVIEW_VALUES,
  type TemplatePlaceholder,
  type VisaTemplate,
} from './types';

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

  function onDrop(target: TemplatePlaceholder) {
    if (dragId) reorder(dragId, target.id);
    setDragId(null);
  }

  const visaNumber = PREVIEW_VALUES.visa_number;

  return (
    <section id="vt-section-body" className="vt-section vt-section--body" data-section="body">
      {!previewMode ? <div className="vt-section__label">Body</div> : null}

      <div className="vt-evisa-body">
        <div className="vt-evisa-watermark" aria-hidden>
          <img src={DEFAULT_WATERMARK} alt="" />
        </div>

        <div className="vt-evisa-main">
          <div className="vt-evisa-fields" style={{ fontSize }}>
            {!previewMode ? (
              <p className="vt-evisa-fields-hint">Drag rows to reorder fields</p>
            ) : null}
            <ul className="vt-evisa-field-list">
              {body.placeholders.map((ph) => {
                const value = previewMode ? PREVIEW_VALUES[ph.key] || `/{${ph.key}}` : `{${ph.key}}`;
                return (
                  <li
                    key={ph.id}
                    className={`vt-evisa-field${dragId === ph.id ? ' is-dragging' : ''}${previewMode ? ' is-preview' : ''}`}
                    draggable={!previewMode}
                    onDragStart={() => setDragId(ph.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(ph)}
                    onDragEnd={() => setDragId(null)}
                  >
                    <span className="vt-evisa-field__grip" aria-hidden>
                      {!previewMode ? <GripVertical size={14} /> : null}
                    </span>
                    <strong className="vt-evisa-field__label">{ph.label}</strong>
                    <span className="vt-evisa-field__value">{value}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="vt-evisa-side">
            {body.showPhoto ? (
              <div className="vt-evisa-photo" style={{ borderColor: accentColor }}>
                <User size={36} strokeWidth={1.25} />
                <span>Photo</span>
              </div>
            ) : null}

            {body.showQr ? (
              <div className="vt-evisa-barcode" style={{ borderColor: accentColor }}>
                <div className="vt-evisa-barcode__bars" aria-hidden>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
                <p className="vt-evisa-barcode__number">{visaNumber}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
