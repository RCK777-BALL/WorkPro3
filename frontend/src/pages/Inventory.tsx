/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Download, Upload, AlertTriangle, QrCode } from 'lucide-react';
import Button from '@/components/common/Button';
import InventoryTable from '@/components/inventory/InventoryTable';
import InventoryModal from '@/components/inventory/InventoryModal';
import InventoryMetrics from '@/components/inventory/InventoryMetrics';
import InventoryScanModal from '@/components/inventory/InventoryScanModal';
import { exportToExcel, exportToPDF } from '@/utils/export';
import http from '@/lib/http';
import type { Part } from '@/types';

const Inventory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isScanOpen, setScanOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<Part> | undefined>();
  const [parts, setParts] = useState<Part[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [vendorFilter, setVendorFilter] = useState('');
  const [belowMinOnly, setBelowMinOnly] = useState(false);

  const fetchParts = useCallback(async () => {
    try {
      const res = await http.get('/parts');
      setParts(res.data as Part[]);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory');
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await http.get('/vendors');
      const list = (res.data as any[]).map((v: any) => ({ id: v.id || v._id, name: v.name }));
      setVendors(list);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  }, []);

  useEffect(() => {
    fetchParts();
    fetchVendors();
  }, [fetchParts, fetchVendors]);

  const handleOpenModal = useCallback(
    (part: Part | null, init?: Partial<Part>) => {
      setSelectedPart(part);
      setInitialData(init);
      setModalError(null);
      setModalOpen(true);
    },
    []
  );

  const partMapper = (part: Part) => ({
    ID: part.id,
    Name: part.name,
    Category: part.category ?? '',
    SKU: part.sku,
    Location: part.location ?? '',
    Quantity: part.quantity,
    'Unit Cost': part.unitCost,
    'Reorder Point': part.reorderPoint,
    'Reorder Threshold': part.reorderThreshold,
    'Last Restock Date': part.lastRestockDate ?? '',
    Vendor: part.vendor ?? '',
    'Last Order Date': part.lastOrderDate
  });

  const handleExportExcel = async () => {
    await exportToExcel<Part>(parts, 'inventory', partMapper);
  };

  const handleExportPDF = () => {
    exportToPDF<Part>(parts, 'inventory', partMapper);
  };

  const lowStockParts = parts.filter(
    (part) => part.quantity <= (part.reorderThreshold ?? part.reorderPoint)
  );

  const filteredParts = useMemo(() =>
    parts.filter((part) => {
      if (search && !Object.values(part).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }
      if (belowMinOnly && part.quantity > part.reorderPoint) {
        return false;
      }
      if (vendorFilter && part.vendor !== vendorFilter) {
        return false;
      }
      return true;
    }),
    [parts, search, belowMinOnly, vendorFilter]
  );

  const handleAdjust = async (part: Part) => {
    const deltaStr = window.prompt('Adjustment amount');
    if (!deltaStr) return;
    const delta = Number(deltaStr);
    if (Number.isNaN(delta) || delta === 0) return;
    const reason = window.prompt('Reason for adjustment') || '';
    try {
      await http.post(`/parts/${part.id}/adjust`, { delta, reason });
      await fetchParts();
    } catch (err) {
      console.error('Error adjusting part:', err);
    }
  };

  return (
          <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900">Inventory</h2>
            <p className="text-neutral-500">Manage parts, supplies, and stock levels</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
            {lowStockParts.length > 0 && (
              <Button
                variant="warning"
                icon={<AlertTriangle size={16} />}
                onClick={() =>
                  alert(`Order needed for ${lowStockParts.length} item(s) from vendors`)
                }
              >
                {lowStockParts.length} Low Stock
              </Button>
            )}
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
            <Button
              variant="outline"
              icon={<QrCode size={16} />}
              onClick={() => setScanOpen(true)}
            >
              Scan QR
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => handleOpenModal(null)}
            >
              Add Part
            </Button>
          </div>
        </div>

        <InventoryMetrics parts={parts} />
        {error && <p className="text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row flex-wrap items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <div className="flex items-center flex-1">
            <Search className="text-neutral-500" size={20} />
            <input
              type="text"
              placeholder="Search parts by name, SKU, category..."
              className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-neutral-300 rounded-md px-2 py-1"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={belowMinOnly}
              onChange={(e) => setBelowMinOnly(e.target.checked)}
            />
            <span className="text-sm text-neutral-700">Below Min</span>
          </label>
        </div>

        <InventoryTable
          parts={filteredParts}
          onRowClick={handleOpenModal}
          onAdjust={handleAdjust}
        />

        <InventoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setInitialData(undefined);
          }}
          part={selectedPart}
          initialData={initialData}
          error={modalError}
          onUpdate={async (data: FormData) => {
            try {
              if (selectedPart) {
                await http.put(`/parts/${selectedPart.id}`, data, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              } else {
                await http.post('/parts', data, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              }
              await fetchParts();
              setModalOpen(false);
              setError(null);
            } catch (error: any) {
              console.error('Error saving part:', error);
              if (error.response?.data?.errors) {
                const messages = Object.values(error.response.data.errors).join(' ');
                setModalError(messages);
              } else {
                setError('Failed to save part');
              }
            }
          }}
        />
        <InventoryScanModal
          isOpen={isScanOpen}
          onClose={() => setScanOpen(false)}
          onScanComplete={handleOpenModal}
        />
      </div>
  );
};

export default Inventory;
