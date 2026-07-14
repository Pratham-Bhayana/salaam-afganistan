import { MoreHorizontal, Copy, Pencil, Star, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { VISA_TYPE_LABELS, type VisaTemplate } from './types';

type Props = {
  template: VisaTemplate;
  onDuplicate: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
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

export function TemplateCard({ template, onDuplicate, onSetDefault, onDelete }: Props) {
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
        <div className="vt-card__a4" style={{ borderColor: template.accentColor }}>
          <div className="vt-card__a4-header" style={{ background: template.accentColor }} />
          <div className="vt-card__a4-lines" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="vt-card__a4-qr" aria-hidden />
        </div>
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
                  <button
                    type="button"
                    className="vt-card__dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      onDuplicate(template.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="vt-card__dropdown-item"
                    role="menuitem"
                    disabled={template.isDefault}
                    onClick={() => {
                      onSetDefault(template.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Star size={14} />
                    Set as Default
                  </button>
                  <button
                    type="button"
                    className="vt-card__dropdown-item vt-card__dropdown-item--danger"
                    role="menuitem"
                    onClick={() => {
                      onDelete(template.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
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
