import React, { useEffect, useMemo, useState } from 'react';

import type { ChecklistItem, ChecklistSection, InspectionTemplate } from '../../../../shared/types/inspection';

interface TemplateInput {
  name: string;
  siteId?: string;
  retentionDays?: number;
  sections: ChecklistSection[];
  categories?: string[];
  description?: string;
}

const TemplateWorkspace: React.FC = () => {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [form, setForm] = useState<TemplateInput>({
    name: '',
    siteId: undefined,
    retentionDays: undefined,
    description: '',
    sections: [
      {
        id: 'section-1',
        title: 'General checks',
        items: [],
      },
    ],
    categories: ['safety'],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newItem, setNewItem] = useState<ChecklistItem>({ id: 'item-1', prompt: '', type: 'boolean', required: true });

  const grouped = useMemo(() => {
    return templates.reduce<Record<string, InspectionTemplate[]>>((acc, template) => {
      const key = template.siteId ?? 'global';
      acc[key] = acc[key] ?? [];
      acc[key].push(template);
      return acc;
    }, {});
  }, [templates]);

  useEffect(() => {
    fetch('/api/inspections/templates')
      .then((res) => res.json())
      .then((payload) => setTemplates(payload.data ?? []))
      .catch(() => setTemplates([]));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/inspections/templates', {
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

  const addChecklistItem = () => {
    const [firstSection, ...rest] = form.sections;
    const section = firstSection ?? { id: 'section-1', title: 'General checks', items: [] };
    const updatedSection: ChecklistSection = {
      ...section,
      items: [...section.items, { ...newItem, id: `${section.items.length + 1}-${Date.now()}` }],
    };
    setForm({
      ...form,
      sections: [updatedSection, ...rest],
    });
    setNewItem({ id: `${Date.now()}`, prompt: '', type: 'boolean', required: true });
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
            Description
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Inspection scope and expectations"
            />
          </label>
          <fieldset>
            <legend>Checklist builder</legend>
            <div className="flex flex-col gap-2 rounded border border-neutral-200 p-3">
              <label>
                Item prompt
                <input
                  value={newItem.prompt}
                  onChange={(e) => setNewItem({ ...newItem, prompt: e.target.value })}
                  placeholder="Verify guards in place"
                />
              </label>
              <label>
                Input type
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as ChecklistItem['type'] })}
                >
                  <option value="boolean">Pass/Fail</option>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="choice">Choice</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.required ?? false}
                  onChange={(e) => setNewItem({ ...newItem, required: e.target.checked })}
                />
                Required to complete
              </label>
              <button type="button" onClick={addChecklistItem} disabled={!newItem.prompt}>
                Add checklist item
              </button>
            </div>
            <ul>
              {form.sections[0]?.items.map((item) => (
                <li key={item.id} className="text-sm text-neutral-700">
                  {item.prompt} <span className="text-neutral-400">({item.type})</span>
                </li>
              ))}
            </ul>
          </fieldset>
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
                      <span>Checks: {template.sections.flatMap((section) => section.items).length}</span>
                      {template.retentionDays ? <span>Retention: {template.retentionDays} days</span> : null}
                      <span>Updated: {new Date(template.updatedAt ?? template.createdAt ?? new Date().toISOString()).toLocaleString()}</span>
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
