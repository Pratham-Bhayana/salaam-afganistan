import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Heading,
  LayoutTemplate,
  Settings2,
  TextAlignStart,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { BodyEditor } from './BodyEditor';
import { FooterEditor } from './FooterEditor';
import { HeaderEditor } from './HeaderEditor';
import { MOCK_TEMPLATES } from './mockData';
import { SettingsPanel } from './SettingsPanel';
import { createEmptyTemplate, type VisaTemplate } from './types';
import './visa-templates.css';

type SectionId = 'header' | 'body' | 'footer' | 'settings';

const SECTIONS: { id: SectionId; label: string; icon: typeof Heading }[] = [
  { id: 'header', label: 'Header', icon: Heading },
  { id: 'body', label: 'Body', icon: LayoutTemplate },
  { id: 'footer', label: 'Footer', icon: TextAlignStart },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('header');
  const [previewMode, setPreviewMode] = useState(false);
  const [banner, setBanner] = useState('');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const initial = useMemo(() => {
    if (isNew) return createEmptyTemplate({ name: 'New Visa Template' });
    return MOCK_TEMPLATES.find((t) => t.id === id) ?? createEmptyTemplate({ name: 'New Visa Template' });
  }, [id, isNew]);

  const [template, setTemplate] = useState<VisaTemplate>(initial);

  useEffect(() => {
    setTemplate(initial);
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, [initial]);

  function patch(partial: Partial<VisaTemplate>) {
    setTemplate((prev) => ({ ...prev, ...partial }));
  }

  function scrollToSection(section: SectionId) {
    setActiveSection(section);
    if (section === 'settings') {
      document.getElementById('vt-section-settings')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const el = document.getElementById(`vt-section-${section}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function persist(status: 'draft' | 'active') {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setTemplate((prev) => ({
      ...prev,
      status,
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
    setSaving(false);
    setBanner(status === 'draft' ? 'Draft saved (mock — no backend yet).' : 'Published (mock — no backend yet).');
    window.setTimeout(() => setBanner(''), 2800);
  }

  if (loading) {
    return (
      <div className="vt-builder vt-builder--loading" aria-busy="true">
        <div className="vt-skeleton vt-skeleton--bar" />
        <div className="vt-builder__skeleton-row">
          <div className="vt-skeleton vt-skeleton--rail" />
          <div className="vt-skeleton vt-skeleton--canvas" />
          <div className="vt-skeleton vt-skeleton--rail" />
        </div>
      </div>
    );
  }

  return (
    <div className={`vt-builder${previewMode ? ' is-preview' : ''}`}>
      <header className="vt-builder__topbar">
        <div className="vt-builder__top-left">
          <button
            type="button"
            className="vt-icon-btn"
            onClick={() => navigate('/visa-templates')}
            aria-label="Back to templates"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="vt-builder__title-wrap">
            <p className="vt-builder__eyebrow">Visa Templates</p>
            <h1>{template.name || 'Untitled Template'}</h1>
          </div>
        </div>
        <div className="vt-builder__top-actions">
          <button
            type="button"
            className={`vt-btn vt-btn--ghost${previewMode ? ' is-active' : ''}`}
            onClick={() => setPreviewMode((v) => !v)}
          >
            {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
            {previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            type="button"
            className="vt-btn vt-btn--ghost"
            disabled={saving}
            onClick={() => void persist('draft')}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="vt-btn vt-btn--primary"
            disabled={saving}
            onClick={() => void persist('active')}
          >
            Publish
          </button>
        </div>
      </header>

      <AnimatePresence>
        {banner ? (
          <motion.div
            className="vt-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {banner}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="vt-builder__workspace">
        <aside className={`vt-rail${sidebarOpen ? '' : ' is-collapsed'}`}>
          <button
            type="button"
            className="vt-rail__toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sections' : 'Expand sections'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <nav className="vt-rail__nav" aria-label="Template sections">
            {SECTIONS.map(({ id: sid, label, icon: Icon }) => (
              <button
                key={sid}
                type="button"
                className={`vt-rail__item${activeSection === sid ? ' is-active' : ''}`}
                onClick={() => scrollToSection(sid)}
                title={label}
              >
                <Icon size={16} />
                {sidebarOpen ? <span>{label}</span> : null}
              </button>
            ))}
          </nav>
        </aside>

        <div className="vt-builder__canvas-wrap" ref={canvasRef}>
          <motion.div
            className="vt-a4 glass-card"
            layout
            style={{ ['--vt-accent' as string]: template.accentColor }}
            transition={{ duration: 0.2 }}
          >
            <HeaderEditor
              header={template.header}
              accentColor={template.accentColor}
              fontSize={template.fontSize}
              previewMode={previewMode}
              onChange={(header) => patch({ header })}
            />
            <BodyEditor
              body={template.body}
              accentColor={template.accentColor}
              fontSize={template.fontSize}
              previewMode={previewMode}
              onChange={(body) => patch({ body })}
            />
            <FooterEditor
              footer={template.footer}
              accentColor={template.accentColor}
              fontSize={template.fontSize}
              previewMode={previewMode}
              onChange={(footer) => patch({ footer })}
            />
          </motion.div>
          <p className="vt-builder__hint">
            Live A4 preview — edits update instantly. PDF export comes later.
          </p>
        </div>

        {!previewMode ? (
          <SettingsPanel
            template={template}
            saving={saving}
            onChange={patch}
            onSaveDraft={() => void persist('draft')}
            onPublish={() => void persist('active')}
          />
        ) : (
          <div className="vt-settings vt-settings--preview glass-card">
            <h2>Preview mode</h2>
            <p>Editing is paused. Exit preview to continue adjusting the template.</p>
            <Link to="/visa-templates" className="vt-btn vt-btn--ghost">
              Back to list
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
