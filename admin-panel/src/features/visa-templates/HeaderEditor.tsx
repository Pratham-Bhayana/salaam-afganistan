import { ImagePlus } from 'lucide-react';
import type { VisaTemplate } from './types';

type Props = {
  header: VisaTemplate['header'];
  accentColor: string;
  fontSize: number;
  previewMode?: boolean;
  onChange: (next: VisaTemplate['header']) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function HeaderEditor({ header, accentColor, fontSize, previewMode, onChange }: Props) {
  async function onLogoChange(
    field: 'salaamLogoUrl' | 'embassyLogoUrl',
    file: File | null
  ) {
    if (!file) {
      onChange({ ...header, [field]: null });
      return;
    }
    const url = await readFileAsDataUrl(file);
    onChange({ ...header, [field]: url });
  }

  return (
    <section id="vt-section-header" className="vt-section" data-section="header">
      <div className="vt-section__label">Header</div>
      <div className="vt-a4-header" style={{ borderBottomColor: accentColor }}>
        <div className="vt-a4-logos">
          {(['salaamLogoUrl', 'embassyLogoUrl'] as const).map((field) => {
            const label = field === 'salaamLogoUrl' ? 'Salaam logo' : 'Embassy logo';
            const url = header[field];
            return (
              <label key={field} className={`vt-logo-slot${previewMode ? ' is-preview' : ''}`}>
                {url ? (
                  <img src={url} alt={label} />
                ) : (
                  <span>
                    {!previewMode ? <ImagePlus size={16} /> : null}
                    {label}
                  </span>
                )}
                {!previewMode ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onLogoChange(field, e.target.files?.[0] ?? null)}
                  />
                ) : null}
              </label>
            );
          })}
        </div>

        {previewMode ? (
          <>
            <h2 className="vt-a4-title" style={{ color: accentColor, fontSize: fontSize + 4 }}>
              {header.title}
            </h2>
            <p className="vt-a4-address" style={{ fontSize }}>{header.addressLine}</p>
          </>
        ) : (
          <>
            <input
              className="vt-a4-title-input"
              style={{ color: accentColor, fontSize: fontSize + 4 }}
              value={header.title}
              onChange={(e) => onChange({ ...header, title: e.target.value })}
              aria-label="Template title"
            />
            <input
              className="vt-a4-address-input"
              style={{ fontSize }}
              value={header.addressLine}
              onChange={(e) => onChange({ ...header, addressLine: e.target.value })}
              aria-label="Address and contact line"
            />
          </>
        )}
      </div>
    </section>
  );
}
