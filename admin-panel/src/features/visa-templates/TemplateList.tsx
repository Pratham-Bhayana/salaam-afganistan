import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FileStack, Pencil, RefreshCw } from 'lucide-react';
import { ApiError, staffHasPermission } from '../../api/client';
import { useAuth } from '../../api/AuthContext';
import {
  fromApiTemplate,
  getDefaultVisaTemplate,
  listVisaTemplates,
} from '../../api/visaTemplates';
import { TemplateCard } from './TemplateCard';
import { createEmptyTemplate, type VisaTemplate } from './types';
import './visa-templates.css';

export function TemplateList() {
  const { staff } = useAuth();
  const canAccess = staffHasPermission(staff, 'fees_content:manage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<VisaTemplate | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      try {
        const { data } = await getDefaultVisaTemplate();
        setTemplate(fromApiTemplate(data));
      } catch {
        const { data } = await listVisaTemplates();
        const first = Array.isArray(data) ? data[0] : null;
        if (first) setTemplate(fromApiTemplate(first));
        else setTemplate(createEmptyTemplate({ name: 'Salaam eVISA Template', isDefault: true }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load visa template');
      setTemplate(createEmptyTemplate({ name: 'Salaam eVISA Template', isDefault: true }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cards = useMemo(() => (template ? [template] : []), [template]);

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="vt-list">
      <header className="vt-list__header">
        <div>
          <h1>Visa Templates</h1>
          <p>One eVISA sheet — fields are saved per visa type and used when generating visas.</p>
        </div>
        <div className="vt-list__header-actions">
          <button type="button" className="vt-btn vt-btn--ghost" onClick={() => void load()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link
            to={template?.id ? `/visa-templates/${template.id}` : '/visa-templates/default'}
            className="vt-btn vt-btn--primary"
          >
            <Pencil size={16} />
            Edit template
          </Link>
        </div>
      </header>

      {error ? <div className="vt-banner">{error}</div> : null}

      {loading ? (
        <div className="vt-list__grid" aria-busy="true">
          <div className="vt-skeleton-card glass-card" />
        </div>
      ) : cards.length ? (
        <div className="vt-list__grid">
          {cards.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
      ) : (
        <div className="vt-empty glass-card">
          <FileStack size={28} />
          <h2>No template yet</h2>
          <p>Open the editor to create the single eVISA template.</p>
          <Link to="/visa-templates/default" className="vt-btn vt-btn--primary">
            Open editor
          </Link>
        </div>
      )}
    </div>
  );
}
