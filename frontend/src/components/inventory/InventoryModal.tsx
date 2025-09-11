/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Button from '@/components/common/Button';
import Modal from '@/components/modals/Modal';
import type { Part } from '@/types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: Part | null;
  onUpdate: (data: FormData) => void;
  error?: string | null;
  initialData?: Partial<Part>;
}

const defaultPartState = {
  name: '',
  description: '',
  category: '',
  sku: '',
  location: '',
  quantity: 0,
  unitCost: 0,
  reorderPoint: 0,
  reorderThreshold: 0,
  lastRestockDate: new Date().toISOString().split('T')[0],
  vendor: '',
  lastOrderDate: new Date().toISOString().split('T')[0],
};

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  part,
  onUpdate,
  error,
  initialData,
}) => {
  const [formData, setFormData] = useState(
    part ? { ...defaultPartState, ...part } : { ...defaultPartState, ...initialData }
  );
  const [partImage, setPartImage] = useState<File | null>(null);

  useEffect(() => {
    setFormData(
      part ? { ...defaultPartState, ...part } : { ...defaultPartState, ...initialData }
    );
    setPartImage(null);
  }, [part, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = { ...formData };

    // Convert numeric strings to numbers if necessary
    payload.quantity = typeof payload.quantity === 'string' ? Number(payload.quantity) : payload.quantity;
    payload.unitCost = typeof payload.unitCost === 'string' ? Number(payload.unitCost) : payload.unitCost;
    payload.reorderPoint = typeof payload.reorderPoint === 'string' ? Number(payload.reorderPoint) : payload.reorderPoint;
    payload.reorderThreshold =
      typeof payload.reorderThreshold === 'string'
        ? Number(payload.reorderThreshold)
        : payload.reorderThreshold;

    // Omit vendor when empty so validation can treat it as optional
    if (!payload.vendor || payload.vendor.trim() === '') {
      delete payload.vendor;
    }

    const data = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        data.append(key, value as any);
      }
    });
    if (partImage) {
      data.append('partImage', partImage);
    }

    onUpdate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={part ? 'Edit Part' : 'Add New Part'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Category
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Unit Cost
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Reorder Point
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.reorderThreshold}
                onChange={(e) => setFormData({ ...formData, reorderThreshold: parseInt(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Restock Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.lastRestockDate}
                onChange={(e) => setFormData({ ...formData, lastRestockDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Vendor
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Last Order Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.lastOrderDate}
                onChange={(e) => setFormData({ ...formData, lastOrderDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Part Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                <div className="flex text-sm text-neutral-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e) => setPartImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-neutral-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {part ? 'Update Part' : 'Add Part'}
            </Button>
          </div>
        </form>
    </Modal>
  );
};

export default InventoryModal;
