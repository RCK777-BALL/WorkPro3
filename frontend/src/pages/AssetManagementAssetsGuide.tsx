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
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import http from '@/lib/http';
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

const quickActions = [
  { label: 'Asset Explorer', to: null },
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
      interface AssetResponse extends Partial<Asset> { _id?: string }
      const res = await http.get<AssetResponse[]>('/assets');
      const parsedAssets = Array.isArray(res.data)
        ? res.data.flatMap((asset) => {
            const resolvedId = asset._id ?? asset.id;
            if (!resolvedId) return [] as Asset[];
            return [
              {
                id: resolvedId,
                name: asset.name ?? 'Unnamed Asset',
                type: asset.type,
                location: asset.location,
                stationId: asset.stationId,
                department: asset.department,
                line: asset.line,
                station: asset.station,
                createdAt: asset.createdAt,
              },
            ];
          })
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
          <h1 className="text-3xl font-bold text-neutral-900">Assets Setup Guide</h1>
          <p className="text-neutral-600 max-w-4xl">
            Stand up a clean asset library with the right hierarchy, context, and documentation so technicians can
            find equipment quickly and maintenance reports stay accurate.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((link) => (
            <Button
              key={link.label}
              asChild={Boolean(link.to)}
              variant="outline"
              onClick={!link.to ? openExplorer : undefined}
            >
              {link.to ? <Link to={link.to}>{link.label}</Link> : <span>{link.label}</span>}
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

      {showExplorer && (
        <Card id="asset-explorer">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Asset Explorer</h3>
              <p className="text-neutral-700">
                See every asset you have created in one place. Use the list to jump into details or confirm your
                hierarchy is complete.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/assets">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Assets
                </Link>
              </Button>
              <Button variant="outline" onClick={fetchAssets} disabled={isLoadingAssets}>
                {isLoadingAssets ? 'Refreshing...' : 'Refresh list'}
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {assetError && <p className="text-red-600">{assetError}</p>}
            {isLoadingAssets && !assets.length ? (
              <p className="text-neutral-600">Loading assets…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {normalizedAssets.length === 0 ? (
                  <p className="text-neutral-600">No assets have been created yet.</p>
                ) : (
                  normalizedAssets.map((asset) => (
                    <div key={asset.id} className="rounded-lg border border-neutral-200 p-3 shadow-sm">
                      <p className="text-base font-semibold text-neutral-900">{asset.name}</p>
                      <p className="text-sm text-neutral-600">
                        {asset.type ?? 'Type not specified'}
                        {asset.location ? ` • ${asset.location}` : ''}
                      </p>
                      {(asset.department || asset.line || asset.station) && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {[asset.department, asset.line, asset.station].filter(Boolean).join(' › ')}
                        </p>
                      )}
                      {asset.createdAt && (
                        <p className="text-xs text-neutral-500 mt-1">Created {new Date(asset.createdAt).toLocaleDateString()}</p>
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
