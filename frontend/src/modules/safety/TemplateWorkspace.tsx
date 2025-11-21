import React, { useEffect, useMemo, useState } from 'react';

interface TemplateInput {
  name: string;
  siteId?: string;
  retentionDays?: number;
  checklists: string[];
}

interface SafetyTemplate extends TemplateInput {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const TemplateWorkspace: React.FC = () => {
  const [templates, setTemplates] = useState<SafetyTemplate[]>([]);
  const [form, setForm] = useState<TemplateInput>({ name: '', siteId: undefined, retentionDays: undefined, checklists: ['JSA', 'Permit'] });
  const [isSaving, setIsSaving] = useState(false);

  const grouped = useMemo(() => {
    return templates.reduce<Record<string, SafetyTemplate[]>>((acc, template) => {
      const key = template.siteId ?? 'global';
      acc[key] = acc[key] ?? [];
      acc[key].push(template);
      return acc;
    }, {});
  }, [templates]);

  useEffect(() => {
    fetch('/api/safety/templates')
      .then((res) => res.json())
      .then((payload) => setTemplates(payload.data ?? []))
      .catch(() => setTemplates([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/safety/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (payload?.data) {
        setTemplates((prev) => [...prev, payload.data]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="safety-template-workspace">
      <header>
        <h2>Safety templates</h2>
        <p>Create and iterate on site-specific checklists, JSAs, and permit templates.</p>
      </header>

      <section className="safety-template-form">
        <h3>New template</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Hot work permit"
              required
            />
          </label>
          <label>
            Site (optional)
            <input
              value={form.siteId ?? ''}
              onChange={(e) => setForm({ ...form, siteId: e.target.value || undefined })}
              placeholder="SITE-1"
            />
          </label>
          <label>
            Retention (days)
            <input
              type="number"
              value={form.retentionDays ?? ''}
              onChange={(e) =>
                setForm({ ...form, retentionDays: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="365"
            />
          </label>
          <label>
            Checklists
            <textarea
              value={form.checklists.join('\n')}
              onChange={(e) => setForm({ ...form, checklists: e.target.value.split('\n').filter(Boolean) })}
              placeholder={'JSA\nPermit'}
            />
          </label>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save template'}
          </button>
        </form>
      </section>

      <section className="safety-template-list">
        <h3>Templates by site</h3>
        {Object.entries(grouped).map(([site, siteTemplates]) => (
          <div key={site} className="safety-template-group">
            <h4>{site === 'global' ? 'All sites' : site}</h4>
            <ul>
              {siteTemplates
                .sort((a, b) => b.version - a.version)
                .map((template) => (
                  <li key={template.id}>
                    <strong>{template.name}</strong> v{template.version}
                    <div className="meta">
                      <span>Checklists: {template.checklists.join(', ') || 'None'}</span>
                      {template.retentionDays ? <span>Retention: {template.retentionDays} days</span> : null}
                      <span>Updated: {new Date(template.updatedAt).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
};

export default TemplateWorkspace;
