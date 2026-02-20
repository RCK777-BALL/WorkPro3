/*
 * SPDX-License-Identifier: MIT
 */

import { Fragment } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getTemplatePreview,
  useClonePmTemplate,
  useInspectionFormLibrary,
  usePmTemplateLibrary,
} from '../hooks';

const TemplateLibrary = () => {
  const { data, isLoading, isError, refetch } = usePmTemplateLibrary();
  const inspectionForms = useInspectionFormLibrary();
  const cloneMutation = useClonePmTemplate();

  const handleClone = async (templateId: string, title: string) => {
    try {
      await cloneMutation.mutateAsync(templateId);
      toast.success(`${title} added to PM templates.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to clone template';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading template library…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
        <span>Unable to load PM templates.</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/90 hover:bg-white/10"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  if (!data?.length) {
    return <p className="mt-4 text-sm text-white/70">Library templates will appear here.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {data.map((template) => {
        const preview = getTemplatePreview(template);
        const cloning = cloneMutation.isPending && cloneMutation.variables === template.id;
        return (
          <div
            key={template.id}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/30"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/50">{template.category}</p>
                <h4 className="text-base font-semibold">{template.title}</h4>
                <p className="text-sm text-white/70">{template.description}</p>
                <div className="mt-2 text-xs text-white/60">
                  <span className="font-semibold text-white/80">Interval:</span> {template.interval}
                  <span className="mx-2 inline-block h-1 w-1 rounded-full bg-white/40 align-middle" />
                  <span className="font-semibold text-white/80">Checklist:</span> {preview}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleClone(template.id, template.title)}
                disabled={cloning}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cloning ? (
                  <Fragment>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…
                  </Fragment>
                ) : (
                  'Add template'
                )}
              </button>
            </div>
          </div>
        );
      })}

      <div className="pt-3">
        <p className="text-xs uppercase tracking-widest text-white/60">Inspection forms</p>
        {inspectionForms.isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading forms…
          </div>
        ) : inspectionForms.isError ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <span>Unable to load inspection forms.</span>
            <button
              type="button"
              onClick={() => inspectionForms.refetch()}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/90 hover:bg-white/10"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {inspectionForms.data?.map((form) => (
              <div
                key={form.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/80"
              >
                <p className="text-xs uppercase tracking-widest text-white/50">{form.category}</p>
                <p className="text-base font-semibold text-white">{form.title}</p>
                <p className="text-white/70">{form.description}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                  {form.sections.slice(0, 2).map((section) => (
                    <li key={section.heading}>
                      <span className="font-semibold text-white/80">{section.heading}:</span> {section.items.slice(0, 2).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;

