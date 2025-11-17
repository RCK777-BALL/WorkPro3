/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  PackageCheck,
  Layers,
  ClipboardList,
  Link as LinkIcon,
  UploadCloud,
  ShieldCheck,
  FileText,
  Settings,
  BookOpen,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

const readinessChecklist = [
  {
    title: 'Gather asset basics',
    description: 'Name, category, manufacturer, model, and serial number details.',
    icon: <PackageCheck className="h-5 w-5 text-primary-600" />,
  },
  {
    title: 'Confirm hierarchy placement',
    description: 'Plant, department, line, and station where the asset will live.',
    icon: <Layers className="h-5 w-5 text-primary-600" />,
  },
  {
    title: 'Collect documentation',
    description: 'Photos, manuals, warranty files, and safety procedures for technicians.',
    icon: <FileText className="h-5 w-5 text-primary-600" />,
  },
];

const assetSteps = [
  {
    title: 'Create or import assets',
    description:
      'Add assets manually for one-off records or use the import tool to bring a larger batch online.',
    points: [
      'From the Assets page, click “Add Asset” and complete the required fields.',
      'Use Imports to bulk add equipment from spreadsheets with consistent column mapping.',
      'Include barcodes or QR codes now so technicians can scan assets on the floor.',
    ],
    icon: <UploadCloud className="h-6 w-6 text-primary-600" />,
  },
  {
    title: 'Place assets in the hierarchy',
    description:
      'Keep assets organized by assigning their plant, department, line, and station right away.',
    points: [
      'Choose the correct location to inherit work orders and reports for that area.',
      'Use the explorer view to drag-and-drop assets if you need to reorganize later.',
      'Add location notes (e.g., aisle, cabinet, level) so crews can find equipment fast.',
    ],
    icon: <LinkIcon className="h-6 w-6 text-primary-600" />,
  },
  {
    title: 'Capture maintenance context',
    description:
      'Help technicians succeed by attaching upkeep details and safety information.',
    points: [
      'List spare parts, lubrication specs, and critical measurements.',
      'Assign PM templates or schedules so recurring work is generated automatically.',
      'Attach SOPs and lockout/tagout checklists for safe interventions.',
    ],
    icon: <ClipboardList className="h-6 w-6 text-primary-600" />,
  },
  {
    title: 'Harden data quality',
    description: 'Use governance checks to keep asset data reliable over time.',
    points: [
      'Review required fields before saving to avoid incomplete records.',
      'Use consistent naming and codes to align with on-site labels and signage.',
      'Audit change history periodically to confirm ownership and accuracy.',
    ],
    icon: <ShieldCheck className="h-6 w-6 text-primary-600" />,
  },
];

const quickActions = [
  { label: 'Add Asset', to: '/assets?intent=add' },
  { label: 'Edit Asset', to: '/assets?intent=edit' },
  { label: 'Duplicate Asset', to: '/assets?intent=duplicate' },
  { label: 'Assets Home', to: '/assets' },
  { label: 'Asset Explorer', to: '/assets/explorer' },
  { label: 'Import Assets', to: '/imports' },
  { label: 'Asset Management Guide', to: '/documentation/asset-management' },
];

const AssetManagementAssetsGuide: React.FC = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary-700">
        <BookOpen className="h-5 w-5" />
        <span className="text-sm font-medium">Guides / Asset Management / Assets</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900">Assets Setup Guide</h1>
        <p className="text-neutral-600 max-w-4xl">
          Stand up a clean asset library with the right hierarchy, context, and documentation so technicians can
          find equipment quickly and maintenance reports stay accurate.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {quickActions.map((link) => (
          <Button key={link.to} asChild variant="outline">
            <Link to={link.to}>{link.label}</Link>
          </Button>
        ))}
      </div>
    </div>

    <Card className="bg-primary-50 border-primary-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {readinessChecklist.map((item) => (
          <div key={item.title} className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border border-primary-100">
              {item.icon}
            </div>
            <div>
              <p className="font-semibold text-neutral-900">{item.title}</p>
              <p className="text-sm text-neutral-700">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {assetSteps.map((step) => (
        <Card key={step.title} className="h-full">
          <div className="flex gap-3 items-start">
            <div className="p-3 rounded-lg bg-primary-50">{step.icon}</div>
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{step.title}</h2>
                <p className="text-neutral-600 mt-1">{step.description}</p>
              </div>
              <ul className="space-y-2 list-disc list-inside text-neutral-700">
                {step.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}
    </div>

    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Keep your asset data current</h3>
          <p className="text-neutral-700">
            Schedule periodic reviews to update meter readings, validate warranty dates, and close completed work
            orders so reporting stays trustworthy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/assets">
              <Settings className="h-4 w-4 mr-2" />
              Go to Assets
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/assets/explorer">Open Explorer</Link>
          </Button>
        </div>
      </div>
    </Card>
  </div>
);

export default AssetManagementAssetsGuide;
