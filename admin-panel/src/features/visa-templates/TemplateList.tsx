import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileStack, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MOCK_TEMPLATES } from './mockData';
import { TemplateCard } from './TemplateCard';
import { VISA_TYPE_LABELS, createEmptyTemplate, type VisaTemplate, type VisaType } from './types';
import './visa-templates.css';

type VisaFilter = 'all' | VisaType;

export function TemplateList() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<VisaTemplate[]>(MOCK_TEMPLATES);
  const [visaFilter, setVisaFilter] = useState<VisaFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 550);
    return () => window.clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (visaFilter !== 'all' && tpl.visaType !== visaFilter) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        VISA_TYPE_LABELS[tpl.visaType].toLowerCase().includes(q)
      );
    });
  }, [templates, visaFilter, search]);

  function onDuplicate(id: string) {
    const source = templates.find((t) => t.id === id);
    if (!source) return;
    const copy = createEmptyTemplate({
      ...structuredClone(source),
      id: `tpl-${Date.now()}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      isDefault: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setTemplates((prev) => [copy, ...prev]);
  }

  function onSetDefault(id: string) {
    setTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === id,
        updatedAt: t.id === id ? new Date().toISOString().slice(0, 10) : t.updatedAt,
      }))
    );
  }

  function onDelete(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="vt-list">
      <header className="vt-list__header">
        <div className="vt-list__titles">
          <h1>Visa Templates</h1>
          <p>Manage visa document templates</p>
        </div>
        <Link to="/visa-templates/new" className="vt-btn vt-btn--primary">
          <Plus size={16} strokeWidth={2.5} />
          Create New Template
        </Link>
      </header>

      <div className="vt-list__toolbar glass-card">
        <label className="vt-field vt-field--inline">
          <span className="vt-field__label">Visa type</span>
          <select
            value={visaFilter}
            onChange={(e) => setVisaFilter(e.target.value as VisaFilter)}
            aria-label="Filter by visa type"
          >
            {(Object.keys(VISA_TYPE_LABELS) as Array<keyof typeof VISA_TYPE_LABELS>).map((key) => (
              <option key={key} value={key}>
                {VISA_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="vt-search">
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="search"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="vt-grid" aria-busy="true" aria-label="Loading templates">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vt-skeleton-card glass-card">
              <div className="vt-skeleton vt-skeleton--a4" />
              <div className="vt-skeleton vt-skeleton--line" />
              <div className="vt-skeleton vt-skeleton--line vt-skeleton--short" />
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              className="vt-empty glass-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <FileStack size={36} strokeWidth={1.5} />
              <h2>No templates match</h2>
              <p>Try another visa type or clear your search to see all templates.</p>
              <button
                type="button"
                className="vt-btn vt-btn--ghost"
                onClick={() => {
                  setVisaFilter('all');
                  setSearch('');
                }}
              >
                Clear filters
              </button>
            </motion.div>
          ) : (
            <div className="vt-grid">
              {filtered.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onDuplicate={onDuplicate}
                  onSetDefault={onSetDefault}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
