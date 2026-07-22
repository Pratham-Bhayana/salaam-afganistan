import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
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
import { ApiError, staffHasPermission } from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import {
  fromApiTemplate,
  getDefaultVisaTemplate,
  listVisaTemplates,
  saveVisaTemplate,
} from '../../api/visaTemplates';
import { BodyEditor } from './BodyEditor';
import { FooterEditor } from './FooterEditor';
import { HeaderEditor } from './HeaderEditor';
import { SettingsPanel } from './SettingsPanel';
import {
  DEFAULT_PLACEHOLDERS,
  createEmptyTemplate,
  type TemplatePlaceholder,
  type VisaTemplate,
  type VisaType,
} from './types';
import './visa-templates.css';

type SectionId = 'header' | 'body' | 'footer' | 'settings';

const SECTIONS: { id: SectionId; label: string; icon: typeof Heading }[] = [
  { id: 'header', label: 'Header', icon: Heading },
  { id: 'body', label: 'Body', icon: LayoutTemplate },
  { id: 'footer', label: 'Footer', icon: TextAlignStart },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const VISA_TYPES: VisaType[] = ['tourist', 'business', 'student', 'transit'];

function ensureFieldMap(
  template: VisaTemplate
): Record<VisaType, TemplatePlaceholder[]> {
  const map = { ...(template.fieldsByVisaType || {}) } as Record<VisaType, TemplatePlaceholder[]>;
  for (const vt of VISA_TYPES) {
    if (!map[vt]?.length) {
      map[vt] = DEFAULT_PLACEHOLDERS.map((p) => ({ ...p, id: `ph-${vt}-${p.key}` }));
    }
  }
  map[template.visaType] = template.body.placeholders.map((p) => ({ ...p }));
  return map;
}

export function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { staff } = useAuth();
  const canAccess = staffHasPermission(staff, 'fees_content:manage');

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('header');
  const [previewMode, setPreviewMode] = useState(false);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<VisaTemplate>(() =>
    createEmptyTemplate({ name: 'Salaam eVISA Template', isDefault: true })
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let doc;
      try {
        ({ data: doc } = await getDefaultVisaTemplate());
      } catch {
        const { data } = await listVisaTemplates();
        doc = Array.isArray(data) ? data[0] : null;
        if (id && id !== 'new' && id !== 'default' && Array.isArray(data)) {
          doc = data.find((t) => t._id === id) || doc;
        }
      }
      if (doc) {
        setTemplate(fromApiTemplate(doc, 'tourist'));
      } else {
        setTemplate(createEmptyTemplate({ name: 'Salaam eVISA Template', isDefault: true }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load template');
      setTemplate(createEmptyTemplate({ name: 'Salaam eVISA Template', isDefault: true }));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(partial: Partial<VisaTemplate>) {
    setTemplate((prev) => {
      let next: VisaTemplate = { ...prev, ...partial };

      // Switching visa type: stash current fields, load target set
      if (partial.visaType && partial.visaType !== prev.visaType) {
        const map = ensureFieldMap(prev);
        map[prev.visaType] = prev.body.placeholders.map((p) => ({ ...p }));
        const nextFields =
          map[partial.visaType]?.map((p) => ({ ...p })) ||
          DEFAULT_PLACEHOLDERS.map((p) => ({ ...p, id: `ph-${partial.visaType}-${p.key}` }));
        next = {
          ...next,
          visaType: partial.visaType,
          fieldsByVisaType: map,
          body: { ...next.body, placeholders: nextFields },
        };
      }

      // Body field edits also update the map for active type
      if (partial.body?.placeholders) {
        const map = ensureFieldMap({ ...prev, ...next });
        map[next.visaType] = partial.body.placeholders.map((p) => ({ ...p }));
        next = { ...next, fieldsByVisaType: map };
      }

      return next;
    });
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
    setError('');
    try {
      const nextLocal: VisaTemplate = {
        ...template,
        status,
        fieldsByVisaType: ensureFieldMap(template),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      const { data } = await saveVisaTemplate(nextLocal);
      setTemplate(fromApiTemplate(data, nextLocal.visaType));
      setBanner(
        status === 'draft'
          ? 'Draft saved to backend.'
          : 'Template published — visas will use these fields by visa type.'
      );
      window.setTimeout(() => setBanner(''), 3200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  if (!canAccess) return <Navigate to="/" replace />;

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
            <p className="vt-builder__eyebrow">Visa Templates · single sheet</p>
            <h1>{template.name || 'Salaam eVISA Template'}</h1>
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
            {saving ? 'Saving…' : 'Save & Publish'}
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
      {error ? <div className="vt-banner" style={{ background: 'rgba(180,40,40,0.12)', color: '#8b1e1e' }}>{error}</div> : null}

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
            className="vt-a4"
            style={{ ['--vt-accent' as string]: template.accentColor }}
            initial={false}
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
            Editing fields for <strong>{template.visaType}</strong> — save to apply when generating visas of that type.
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
            <p>Showing filled sample values. Exit preview to edit fields for each visa type.</p>
            <Link to="/visa-templates" className="vt-btn vt-btn--ghost">
              Back
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
