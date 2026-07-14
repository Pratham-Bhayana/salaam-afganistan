import { ImagePlus, RotateCcw } from 'lucide-react';
import {
  DEFAULT_EMBASSY_LOGO,
  DEFAULT_SALAAM_LOGO,
  type VisaTemplate,
} from './types';

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

function resolveLogo(url: string | null, fallback: string) {
  return url || fallback;
}

export function HeaderEditor({ header, accentColor, fontSize, previewMode, onChange }: Props) {
  async function onLogoChange(field: 'salaamLogoUrl' | 'embassyLogoUrl', file: File | null) {
    if (!file) {
      onChange({
        ...header,
        [field]: field === 'salaamLogoUrl' ? DEFAULT_SALAAM_LOGO : DEFAULT_EMBASSY_LOGO,
      });
      return;
    }
    const url = await readFileAsDataUrl(file);
    onChange({ ...header, [field]: url });
  }

  function resetLogo(field: 'salaamLogoUrl' | 'embassyLogoUrl') {
    onChange({
      ...header,
      [field]: field === 'salaamLogoUrl' ? DEFAULT_SALAAM_LOGO : DEFAULT_EMBASSY_LOGO,
    });
  }

  const salaamSrc = resolveLogo(header.salaamLogoUrl, DEFAULT_SALAAM_LOGO);
  const embassySrc = resolveLogo(header.embassyLogoUrl, DEFAULT_EMBASSY_LOGO);

  return (
    <section id="vt-section-header" className="vt-section" data-section="header">
      {!previewMode ? <div className="vt-section__label">Header</div> : null}

      <div className="vt-evisa-header">
        <div className="vt-evisa-logos">
          {(
            [
              { field: 'salaamLogoUrl' as const, src: salaamSrc, label: 'Raizing / Salaam logo' },
              { field: 'embassyLogoUrl' as const, src: embassySrc, label: 'State emblem' },
            ] as const
          ).map(({ field, src, label }) => (
            <div key={field} className="vt-evisa-logo-wrap">
              <label className={`vt-evisa-logo${previewMode ? ' is-preview' : ''}`}>
                <img src={src} alt={label} />
                {!previewMode ? (
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={`Replace ${label}`}
                    onChange={(e) => void onLogoChange(field, e.target.files?.[0] ?? null)}
                  />
                ) : null}
                {!previewMode ? (
                  <span className="vt-evisa-logo__hint">
                    <ImagePlus size={14} />
                    Replace
                  </span>
                ) : null}
              </label>
              {!previewMode ? (
                <button
                  type="button"
                  className="vt-evisa-logo-reset"
                  onClick={() => resetLogo(field)}
                  title="Reset to default logo"
                >
                  <RotateCcw size={12} />
                  Default
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="vt-evisa-authority" style={{ fontSize }}>
          {previewMode ? (
            <>
              <p className="vt-evisa-gov">{header.govLine}</p>
              <p className="vt-evisa-ministry">{header.ministryLine}</p>
              <p className="vt-evisa-system">{header.systemLine}</p>
            </>
          ) : (
            <>
              <input
                className="vt-evisa-gov-input"
                value={header.govLine}
                onChange={(e) => onChange({ ...header, govLine: e.target.value })}
                aria-label="Government line"
              />
              <input
                className="vt-evisa-ministry-input"
                value={header.ministryLine}
                onChange={(e) => onChange({ ...header, ministryLine: e.target.value })}
                aria-label="Ministry line"
              />
              <input
                className="vt-evisa-system-input"
                value={header.systemLine}
                onChange={(e) => onChange({ ...header, systemLine: e.target.value })}
                aria-label="System line"
              />
            </>
          )}
        </div>

        <div className="vt-evisa-section-title" style={{ borderBottomColor: accentColor }}>
          {previewMode ? (
            <h2 style={{ fontSize: fontSize + 3 }}>{header.sectionTitle}</h2>
          ) : (
            <input
              value={header.sectionTitle}
              onChange={(e) => onChange({ ...header, sectionTitle: e.target.value })}
              style={{ fontSize: fontSize + 3 }}
              aria-label="Section title"
            />
          )}
        </div>
      </div>
    </section>
  );
}
