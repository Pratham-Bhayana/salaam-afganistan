import type { VisaTemplate } from './types';

type Props = {
  footer: VisaTemplate['footer'];
  accentColor: string;
  fontSize: number;
  previewMode?: boolean;
  onChange: (next: VisaTemplate['footer']) => void;
};

export function FooterEditor({ footer, fontSize, previewMode, onChange }: Props) {
  return (
    <section id="vt-section-footer" className="vt-section" data-section="footer">
      {!previewMode ? <div className="vt-section__label">Footer</div> : null}

      <div className="vt-evisa-footer">
        <div className="vt-evisa-disclaimer-box">
          <strong className="vt-evisa-disclaimer-label">DISCLAIMER:</strong>
          {previewMode ? (
            <p className="vt-evisa-disclaimer" style={{ fontSize: Math.max(10, fontSize - 3) }}>
              {footer.disclaimer}
            </p>
          ) : (
            <textarea
              className="vt-evisa-disclaimer-input"
              style={{ fontSize: Math.max(10, fontSize - 3) }}
              value={footer.disclaimer}
              onChange={(e) => onChange({ ...footer, disclaimer: e.target.value })}
              rows={4}
              aria-label="Disclaimer text"
            />
          )}
        </div>

        {!previewMode ? (
          <label className="vt-toggle">
            <input
              type="checkbox"
              checked={footer.showPageNumbers}
              onChange={(e) => onChange({ ...footer, showPageNumbers: e.target.checked })}
            />
            <span>Show page numbers</span>
          </label>
        ) : null}

        {footer.showPageNumbers ? (
          <div className="vt-page-num" style={{ fontSize: fontSize - 2 }}>
            Page 1 of 1
          </div>
        ) : null}
      </div>
    </section>
  );
}
