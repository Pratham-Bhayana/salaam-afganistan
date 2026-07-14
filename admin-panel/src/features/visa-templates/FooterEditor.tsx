import { ImagePlus, Stamp } from 'lucide-react';
import type { VisaTemplate } from './types';

type Props = {
  footer: VisaTemplate['footer'];
  accentColor: string;
  fontSize: number;
  previewMode?: boolean;
  onChange: (next: VisaTemplate['footer']) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function FooterEditor({ footer, accentColor, fontSize, previewMode, onChange }: Props) {
  async function onImageChange(field: 'signatureUrl' | 'stampUrl', file: File | null) {
    if (!file) {
      onChange({ ...footer, [field]: null });
      return;
    }
    const url = await readFileAsDataUrl(file);
    onChange({ ...footer, [field]: url });
  }

  return (
    <section id="vt-section-footer" className="vt-section" data-section="footer">
      <div className="vt-section__label">Footer</div>
      <div className="vt-a4-footer" style={{ borderTopColor: accentColor }}>
        <div className="vt-a4-marks">
          <label className={`vt-mark-slot${previewMode ? ' is-preview' : ''}`}>
            {footer.signatureUrl ? (
              <img src={footer.signatureUrl} alt="Signature" />
            ) : (
              <span>
                {!previewMode ? <ImagePlus size={14} /> : null}
                Signature
              </span>
            )}
            {!previewMode ? (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onImageChange('signatureUrl', e.target.files?.[0] ?? null)}
              />
            ) : null}
          </label>

          <label className={`vt-mark-slot vt-mark-slot--stamp${previewMode ? ' is-preview' : ''}`}>
            {footer.stampUrl ? (
              <img src={footer.stampUrl} alt="Stamp" />
            ) : (
              <span>
                <Stamp size={16} />
                Stamp / seal
              </span>
            )}
            {!previewMode ? (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onImageChange('stampUrl', e.target.files?.[0] ?? null)}
              />
            ) : null}
          </label>
        </div>

        {previewMode ? (
          <p className="vt-a4-disclaimer" style={{ fontSize: fontSize - 2 }}>
            {footer.disclaimer}
          </p>
        ) : (
          <textarea
            className="vt-a4-disclaimer-input"
            style={{ fontSize: fontSize - 2 }}
            value={footer.disclaimer}
            onChange={(e) => onChange({ ...footer, disclaimer: e.target.value })}
            rows={3}
            aria-label="Disclaimer text"
          />
        )}

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
          <div className="vt-page-num" style={{ color: accentColor, fontSize: fontSize - 2 }}>
            Page 1 of 1
          </div>
        ) : null}
      </div>
    </section>
  );
}
