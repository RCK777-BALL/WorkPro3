/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from "react";
import { Upload } from "lucide-react";

export default function Imports() {
  const [files, setFiles] = useState<File[]>([]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const next = Array.from(event.target.files);
    setFiles(next);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk imports</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Upload spreadsheets to seed assets, parts, teams, or work orders into WorkPro.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-dashed border-neutral-300 bg-white/80 p-8 text-center shadow-sm transition dark:border-neutral-700 dark:bg-neutral-900">
        <Upload className="mx-auto h-10 w-10 text-primary-500" />
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          Drag and drop CSV, XLSX, or JSON files here or click to browse.
        </p>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-500">
          <span>Select files</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            multiple
            className="sr-only"
            onChange={onFileChange}
          />
        </label>
        {files.length > 0 ? (
          <div className="mt-6 space-y-2 text-left text-sm">
            <p className="font-medium text-neutral-700 dark:text-neutral-200">Files ready for processing</p>
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <span>{file.name}</span>
                  <span className="text-xs text-neutral-500">{Math.round(file.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Templates</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Download starter templates to ensure your data is formatted correctly.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { id: "assets", name: "Assets template", href: "/templates/assets.csv" },
            { id: "inventory", name: "Inventory template", href: "/templates/inventory.csv" },
            { id: "teams", name: "Teams template", href: "/templates/teams.csv" },
            { id: "work-orders", name: "Work orders template", href: "/templates/work-orders.csv" },
          ].map((template) => (
            <li key={template.id} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700">
              <a className="font-medium text-primary-600 hover:underline" href={template.href} download>
                {template.name}
              </a>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Includes required fields and sample rows.
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
