import { MoreHorizontal, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_EMBASSY_LOGO,
  DEFAULT_SALAAM_LOGO,
  DEFAULT_WATERMARK,
  PREVIEW_VALUES,
  VISA_TYPE_LABELS,
  type VisaTemplate,
} from './types';

type Props = {
  template: VisaTemplate;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function MiniPreview({ template }: { template: VisaTemplate }) {
  const { header, body, footer } = template;
  const salaamLogo = header.salaamLogoUrl || DEFAULT_SALAAM_LOGO;
  const embassyLogo = header.embassyLogoUrl || DEFAULT_EMBASSY_LOGO;
  const fields = (body.placeholders || []).slice(0, 8);

  return (
    <div className="vt-card__a4" style={{ borderColor: template.accentColor }}>
      <div className="vt-card__a4-logos">
        <img src={salaamLogo} alt="" />
        <img src={embassyLogo} alt="" />
      </div>

      <div className="vt-card__a4-auth">
        <p className="vt-card__a4-gov">{header.govLine}</p>
        <p>{header.ministryLine}</p>
        <p>{header.systemLine}</p>
      </div>

      <p className="vt-card__a4-section">{header.sectionTitle}</p>

      <div className="vt-card__a4-body">
        <div className="vt-card__a4-watermark" aria-hidden>
          <img src={DEFAULT_WATERMARK} alt="" />
        </div>

        <div className="vt-card__a4-main">
          <ul className="vt-card__a4-fields">
            {fields.map((ph) => (
              <li key={ph.id}>
                <strong>{ph.label}</strong>
                <span>{PREVIEW_VALUES[ph.key] || `{${ph.key}}`}</span>
              </li>
            ))}
          </ul>
          <div className="vt-card__a4-side">
            {body.showPhoto ? <div className="vt-card__a4-photo" /> : null}
            {body.showQr ? (
              <div className="vt-card__a4-barcode">
                <div className="vt-card__a4-bars" aria-hidden />
                <em>{PREVIEW_VALUES.visa_number}</em>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="vt-card__a4-disclaimer">
        <strong>DISCLAIMER:</strong>
        <span>{footer.disclaimer}</span>
      </div>
    </div>
  );
}

export function TemplateCard({ template }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  return (
    <motion.article
      className="vt-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22 }}
    >
      <Link to={`/visa-templates/${template.id}`} className="vt-card__preview" tabIndex={-1}>
        <MiniPreview template={template} />
      </Link>

      <div className="vt-card__body">
        <div className="vt-card__top">
          <Link to={`/visa-templates/${template.id}`} className="vt-card__name">
            {template.name}
          </Link>
          <div className="vt-card__menu" ref={menuRef}>
            <button
              type="button"
              className="vt-card__menu-btn"
              aria-label="Template actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  className="vt-card__dropdown"
                  role="menu"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    to={`/visa-templates/${template.id}`}
                    className="vt-card__dropdown-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Pencil size={14} />
                    Edit
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="vt-card__badges">
          <span className="vt-badge vt-badge--type">{VISA_TYPE_LABELS[template.visaType]}</span>
          <span className={`vt-badge vt-badge--${template.status}`}>
            {template.status === 'active' ? 'Active' : 'Draft'}
          </span>
          {template.isDefault ? <span className="vt-badge vt-badge--default">Default</span> : null}
        </div>

        <p className="vt-card__meta">Updated {formatDate(template.updatedAt)}</p>
      </div>
    </motion.article>
  );
}
