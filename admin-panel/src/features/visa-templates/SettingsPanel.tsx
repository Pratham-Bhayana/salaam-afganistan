import { ACCENT_SWATCHES, VISA_TYPE_LABELS, type AccentColor, type VisaTemplate, type VisaType } from './types';

type Props = {
  template: VisaTemplate;
  saving?: boolean;
  onChange: (patch: Partial<VisaTemplate>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

export function SettingsPanel({ template, saving, onChange, onSaveDraft, onPublish }: Props) {
  return (
    <aside id="vt-section-settings" className="vt-settings glass-card" data-section="settings">
      <h2>Settings</h2>

      <label className="vt-field">
        <span className="vt-field__label">Template name</span>
        <input
          type="text"
          value={template.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Standard Tourist Visa"
        />
      </label>

      <label className="vt-field">
        <span className="vt-field__label">Visa type (field set)</span>
        <select
          value={template.visaType}
          onChange={(e) => onChange({ visaType: e.target.value as VisaType })}
        >
          {(Object.keys(VISA_TYPE_LABELS) as Array<keyof typeof VISA_TYPE_LABELS>)
            .filter((k) => k !== 'all')
            .map((key) => (
              <option key={key} value={key}>
                {VISA_TYPE_LABELS[key]}
              </option>
            ))}
        </select>
        <span className="vt-field__hint">
          Fields shown on the sheet are saved for this visa type and used when generating that visa.
        </span>
      </label>

      <div className="vt-field">
        <span className="vt-field__label">Color accent</span>
        <div className="vt-swatches" role="group" aria-label="Accent color">
          {ACCENT_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              className={`vt-swatch${template.accentColor === color ? ' is-active' : ''}`}
              style={{ background: color }}
              aria-label={color}
              aria-pressed={template.accentColor === color}
              onClick={() => onChange({ accentColor: color as AccentColor })}
            />
          ))}
        </div>
      </div>

      <label className="vt-field">
        <span className="vt-field__label">
          Font size <em>{template.fontSize}px</em>
        </span>
        <input
          type="range"
          min={12}
          max={18}
          step={1}
          value={template.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </label>

      <label className="vt-toggle vt-toggle--block">
        <input
          type="checkbox"
          checked={template.body.showPhoto}
          onChange={(e) =>
            onChange({ body: { ...template.body, showPhoto: e.target.checked } })
          }
        />
        <span>Show photo box</span>
      </label>

      <label className="vt-toggle vt-toggle--block">
        <input
          type="checkbox"
          checked={template.body.showQr}
          onChange={(e) =>
            onChange({ body: { ...template.body, showQr: e.target.checked } })
          }
        />
        <span>Show barcode under photo</span>
      </label>

      <div className="vt-settings__actions">
        <button
          type="button"
          className="vt-btn vt-btn--ghost"
          disabled={saving}
          onClick={onSaveDraft}
        >
          Save as Draft
        </button>
        <button
          type="button"
          className="vt-btn vt-btn--primary"
          disabled={saving}
          onClick={onPublish}
        >
          Publish
        </button>
      </div>
    </aside>
  );
}
