/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import http, { TENANT_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import type { Asset } from '@/types';

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

const namingTemplate =
  '<Manufacturer + Model> | <Short description> | <Station / install> | <Line> | <Department> | <Serial number> | <Plant or $> | <Date installed> | <Warranty details> | <Criticality> | <Asset type>';

const namingFields = [
  {
    label: 'Manufacturer + Model',
    description: 'Include every applicable combination, separating multiples with semicolons.',
  },
  {
    label: 'Short description',
    description: 'One concise phrase describing what the asset does so techs recognize it immediately.',
  },
  {
    label: 'Station / install',
    description: 'Match the station identifier or install area that exists in your hierarchy.',
  },
  { label: 'Line', description: 'Use the production or assembly line name tied to the station.' },
  { label: 'Department', description: 'Identifies the owning department for reporting rollups.' },
  {
    label: 'Serial number',
    description: 'Manufacturer serial or asset tag. Use “N/A” if the value is not yet available.',
  },
  {
    label: 'Plant or $',
    description: 'Enter the plant name or a cost flag (such as $) if your governance requires it.',
  },
  {
    label: 'Date installed',
    description: 'Always use ISO format (YYYY-MM-DD) so imports and filters can sort reliably.',
  },
  {
    label: 'Warranty details',
    description: 'Spell out coverage (“Warranty to 2026-04-18” or “Warranty expired”).',
  },
  {
    label: 'Criticality',
    description: 'Reference the standard scale (High/Medium/Low or numeric) defined by your CMMS program.',
  },
  { label: 'Asset type', description: 'Match the WorkPro category (Robot, PLC, Conveyor, Compressor, etc.).' },
];

const namingTips = [
  'Keep the pipe (`|`) delimiter everywhere so imports stay clean and technicians can scan names quickly.',
  'Maintain the exact field order when creating records manually or via CSV uploads.',
  'Document approved criticality levels, asset types, and cost codes so teams reuse the same vocabulary.',
  'Fill every segment—even placeholders like “N/A”—to avoid ambiguous double pipes (||) in the name.',
];

const quickActions = [
  { label: 'Asset Explorer', to: null },
  { label: 'Add Assets to Stations Guide', to: '/documentation/asset-management/assets/add-to-stations' },
  { label: 'Manage Assets', to: '/assets/manage' },
  { label: 'Import Assets', to: '/imports' },
  { label: 'Asset Management Guide', to: '/documentation/asset-management' },
];

const AssetManagementAssetsGuide: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);

  const normalizedAssets = useMemo(() => assets.slice().sort((a, b) => a.name.localeCompare(b.name)), [assets]);

  const fetchAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    setAssetError(null);
    try {
      interface AssetResponse extends Partial<Asset> {
        _id?: string;
      }

      const res = await http.get<AssetResponse[]>('/assets');
      const parsedAssets: Asset[] = Array.isArray(res.data)
        ? res.data.reduce<Asset[]>((acc, asset) => {
            const resolvedId = asset._id ?? asset.id;
            if (!resolvedId) return acc;

            const parsedAsset: Asset = {
              id: resolvedId,
              tenantId: asset.tenantId ?? safeLocalStorage.getItem(TENANT_KEY) ?? 'unknown-tenant',
              name: asset.name ?? 'Unnamed Asset',
              ...(asset.type ? { type: asset.type } : {}),
              ...(asset.location ? { location: asset.location } : {}),
              ...(asset.stationId ? { stationId: asset.stationId } : {}),
              ...(asset.department ? { department: asset.department } : {}),
              ...(asset.line ? { line: asset.line } : {}),
              ...(asset.station ? { station: asset.station } : {}),
              ...(asset.createdAt ? { createdAt: asset.createdAt } : {}),
            };

            acc.push(parsedAsset);
            return acc;
          }, [])
        : [];

      setAssets(parsedAssets);
    } catch (err) {
      console.error('Failed to load assets for explorer quick action', err);
      setAssetError('Unable to load assets right now.');
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (showExplorer) {
      fetchAssets();
    }
  }, [fetchAssets, showExplorer]);

  const openExplorer = () => {
    setShowExplorer(true);
    setTimeout(() => {
      document.getElementById('asset-explorer')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary-700">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Guides / Asset Management / Assets</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">Assets Setup Guide</h1>
          <p className="text-[var(--wp-color-text-muted)] max-w-4xl">
            Stand up a clean asset library with the right hierarchy, context, and documentation so technicians can
            find equipment quickly and maintenance reports stay accurate.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((link) =>
            link.to ? (
              <Link key={link.label} to={link.to} className="inline-flex">
                <Button variant="outline">{link.label}</Button>
              </Link>
            ) : (
              <Button key={link.label} variant="outline" onClick={openExplorer}>
                {link.label}
              </Button>
            ),
          )}
        </div>
      </div>

      <Card className="bg-primary-50 border-primary-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {readinessChecklist.map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-[var(--wp-color-surface)] flex items-center justify-center border border-primary-100">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-[var(--wp-color-text)]">{item.title}</p>
                <p className="text-sm text-[var(--wp-color-text)]">{item.description}</p>
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
                  <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">{step.title}</h2>
                  <p className="text-[var(--wp-color-text-muted)] mt-1">{step.description}</p>
                </div>
                <ul className="space-y-2 list-disc list-inside text-[var(--wp-color-text)]">
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary-50 text-primary-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--wp-color-text)]">Asset naming template</h2>
              <p className="text-[var(--wp-color-text-muted)]">
                Apply a consistent structure whenever you add or import equipment so every record is searchable and easy to
                decode on the floor.
              </p>
            </div>
          </div>
          <pre className="bg-[var(--wp-color-surface)] text-[var(--wp-color-text)] text-sm p-4 rounded-md overflow-x-auto">
            <code>{namingTemplate}</code>
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {namingFields.map((field) => (
              <div key={field.label} className="border border-[var(--wp-color-border)] rounded-lg p-3 shadow-sm">
                <p className="font-semibold text-[var(--wp-color-text)]">{field.label}</p>
                <p className="text-sm text-[var(--wp-color-text-muted)]">{field.description}</p>
              </div>
            ))}
          </div>
          <ul className="list-disc list-inside text-[var(--wp-color-text)] space-y-1">
            {namingTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </Card>

      {showExplorer && (
        <Card id="asset-explorer">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--wp-color-text)]">Asset Explorer</h3>
              <p className="text-[var(--wp-color-text)]">
                See every asset you have created in one place. Use the list to jump into details or confirm your
                hierarchy is complete.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/assets/manage" className="inline-flex">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Assets
                </Button>
              </Link>
              <Button variant="outline" onClick={fetchAssets} disabled={isLoadingAssets}>
                {isLoadingAssets ? 'Refreshing...' : 'Refresh list'}
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {assetError && <p className="text-red-600">{assetError}</p>}
            {isLoadingAssets && !assets.length ? (
              <p className="text-[var(--wp-color-text-muted)]">Loading assets…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {normalizedAssets.length === 0 ? (
                  <p className="text-[var(--wp-color-text-muted)]">No assets have been created yet.</p>
                ) : (
                  normalizedAssets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border border-[var(--wp-color-border)] p-3 shadow-sm">
                      <p className="text-base font-semibold text-[var(--wp-color-text)]">{asset.name}</p>
                      <p className="text-sm text-[var(--wp-color-text-muted)]">
                        {asset.type ?? 'Type not specified'}
                        {asset.location ? ` • ${asset.location}` : ''}
                      </p>
                      {(asset.department || asset.line || asset.station) && (
                        <p className="text-xs text-[var(--wp-color-text-muted)] mt-1">
                          {[asset.department, asset.line, asset.station].filter(Boolean).join(' › ')}
                        </p>
                      )}
                      {asset.createdAt && (
                        <p className="text-xs text-[var(--wp-color-text-muted)] mt-1">Created {new Date(asset.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssetManagementAssetsGuide;

