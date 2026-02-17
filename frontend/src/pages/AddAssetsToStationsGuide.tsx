/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  PackageCheck,
  MapPin,
  Network,
  Layers,
  ClipboardList,
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

const hierarchySteps = [
  {
    title: 'Pick the right plant',
    description:
      'Use the scope selector to confirm the plant where the equipment physically resides so reports roll up correctly.',
    icon: <MapPin className="h-5 w-5 text-primary-600" />,
  },
  {
    title: 'Choose department and line',
    description:
      'Select the owning department and line so work orders, spares, and KPIs stay grouped by production area.',
    icon: <Layers className="h-5 w-5 text-primary-600" />,
  },
  {
    title: 'Drop the asset at a station',
    description:
      'Assign the exact station or work cell. If a station is missing, create it first so the hierarchy stays intact.',
    icon: <Network className="h-5 w-5 text-primary-600" />,
  },
];

const formRequirements = [
  { label: 'Name', detail: 'Clear, human-readable label technicians will search for.', required: true },
  { label: 'Plant', detail: 'Inherited from the active scope or selected in the form.', required: true },
  { label: 'Department, Line, Station', detail: 'Placement inside the hierarchy to anchor reports.', required: true },
  { label: 'Serial number & model', detail: 'Manufacturer identifiers for audits and parts lookups.', required: false },
  { label: 'Maintenance interval', detail: 'Days/weeks between services or meter-based triggers.', required: false },
  { label: 'Documents & media', detail: 'Manuals, photos, SOPs, and warranty PDFs.', required: false },
];

const metadataChecklist = [
  'Add manufacturer, model, and serial values so procurement and maintenance share the same source of truth.',
  'Include installation and warranty dates to drive lifecycle planning and renewal reminders.',
  'Set criticality and status to influence PM generation, dashboards, and technician priority.',
  'Use the location field for aisle/cabinet/row details to speed up on-floor discovery.',
];

const uploadGuidance = [
  'Support images (PNG, JPG) and PDFs for manuals, safety sheets, and inspection photos.',
  'Drag and drop files directly into the uploader or click to browse. Remove any accidental uploads before saving.',
  'Keep filenames descriptive (e.g., "Robot-Arm-KR6_Safety-SOP.pdf") so downloads are recognizable.',
];

const successCriteria = [
  'The asset appears under the selected station in the hierarchy and in the Assets table.',
  'Required fields validate before submission and error messages explain what is missing.',
  'Uploaded documents stay linked to the asset record for technicians to open later.',
  'Metadata such as criticality, status, and maintenance interval is saved with the asset.',
];

const AddAssetsToStationsGuide: React.FC = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary-700">
        <BookOpen className="h-5 w-5" />
        <span className="text-sm font-medium">Guides / Asset Management / Add Assets to Stations</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">Add Assets to Stations</h1>
        <p className="text-[var(--wp-color-text-muted)] max-w-4xl">
          Place equipment at the right station to complete your hierarchy. Capture documents, photos, serial numbers,
          and maintenance intervals so technicians have everything they need when they open the asset record.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/assets" className="inline-flex">
          <Button variant="primary">Go to Assets</Button>
        </Link>
        <Link to="/assets/manage" className="inline-flex">
          <Button variant="outline">Manage Asset Library</Button>
        </Link>
      </div>
    </div>

    <Card className="bg-primary-50 border-primary-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-[var(--wp-color-surface)] text-primary-700">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-[var(--wp-color-text)]">Workflow</p>
            <p className="text-[var(--wp-color-text)]">
              Go to the Assets page and choose “Add Asset.” Walk through the hierarchy fields first, then attach
              supporting files before saving.
            </p>
          </div>
        </div>
        <Link to="/assets?intent=create" className="inline-flex">
          <Button variant="secondary">Start new asset</Button>
        </Link>
      </div>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {hierarchySteps.map((step) => (
        <Card key={step.title} className="h-full">
          <div className="flex gap-3 items-start">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">{step.icon}</div>
            <div className="space-y-1">
              <p className="font-semibold text-[var(--wp-color-text)]">{step.title}</p>
              <p className="text-sm text-[var(--wp-color-text)]">{step.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>

    <Card>
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">Form requirements</h2>
            <p className="text-[var(--wp-color-text)]">
              Complete these fields to make sure each asset is anchored to the correct station and ready for PM planning.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formRequirements.map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--wp-color-border)] p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[var(--wp-color-text)]">{item.label}</p>
                  {item.required && (
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--wp-color-text)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">Metadata checklist</h3>
            <ul className="list-disc list-inside text-[var(--wp-color-text)] space-y-1">
              {metadataChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">Documents & photos</h3>
            <ul className="list-disc list-inside text-[var(--wp-color-text)] space-y-1">
              {uploadGuidance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>

    <Card className="bg-[var(--wp-color-surface)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg bg-[var(--wp-color-surface)] text-primary-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">Validation and success criteria</h3>
            <p className="text-[var(--wp-color-text)]">
              Use this checklist to confirm the asset was saved in the right place with everything technicians need.
            </p>
          </div>
        </div>
        <Link to="/assets" className="inline-flex">
          <Button variant="outline">Review assets</Button>
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {successCriteria.map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-md bg-[var(--wp-color-surface)] p-3 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-success-600 mt-0.5" />
            <p className="text-[var(--wp-color-text)]">{item}</p>
          </div>
        ))}
      </div>
    </Card>

    <Card>
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">Pro tips for accurate placement</h3>
          <ul className="list-disc list-inside text-[var(--wp-color-text)] space-y-1">
            <li>Verify the station exists before saving—misplaced assets create reporting gaps.</li>
            <li>Reuse consistent naming patterns so imports and on-site labels always match.</li>
            <li>Capture maintenance intervals now to auto-generate preventive work without rework later.</li>
            <li>Attach safety procedures alongside manuals so technicians have a single source of truth.</li>
          </ul>
        </div>
      </div>
    </Card>
  </div>
);

export default AddAssetsToStationsGuide;

