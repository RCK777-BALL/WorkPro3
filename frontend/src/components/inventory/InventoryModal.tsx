/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Button from '@/components/common/Button';
import Modal from '@/components/modals/Modal';
import type { Part } from '@/types';

export interface InventorySubmission {
  data: Record<string, unknown>;
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: Part | null;
  onUpdate: (submission: InventorySubmission) => Promise<void>;
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

type PartFormState = typeof defaultPartState & Partial<Part>;

const normalizePartFormState = (data?: Partial<Part> | null): PartFormState => {
  const vendorValue =
    typeof data?.vendor === 'string'
      ? data.vendor
      : data?.vendor?.name ?? '';

  return {
    ...defaultPartState,
    ...data,
    vendor: vendorValue,
    lastRestockDate: data?.lastRestockDate ?? defaultPartState.lastRestockDate,
    lastOrderDate: data?.lastOrderDate ?? defaultPartState.lastOrderDate,
  };
};

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  part,
  onUpdate,
  error,
  initialData,
}) => {
  const [formData, setFormData] = useState<PartFormState>(() =>
    normalizePartFormState(part ?? initialData)
  );
  const [partImage, setPartImage] = useState<File | null>(null);

  const fileToDataUrl = async (file: File): Promise<string> =>
    await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Unable to read file contents'));
        }
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    setFormData(normalizePartFormState(part ?? initialData));
    setPartImage(null);
  }, [part, isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _id, image: _image, ...rest } = formData as Partial<Part> & typeof defaultPartState;
    const payload: Record<string, unknown> = { ...rest };

    payload.quantity = typeof payload.quantity === 'string' ? Number(payload.quantity) : payload.quantity;
    payload.unitCost = typeof payload.unitCost === 'string' ? Number(payload.unitCost) : payload.unitCost;
    payload.reorderPoint = typeof payload.reorderPoint === 'string' ? Number(payload.reorderPoint) : payload.reorderPoint;
    payload.reorderThreshold =
      typeof payload.reorderThreshold === 'string'
        ? Number(payload.reorderThreshold)
        : payload.reorderThreshold;

    if (typeof payload.quantity !== 'number' || Number.isNaN(payload.quantity)) payload.quantity = 0;
    if (typeof payload.unitCost !== 'number' || Number.isNaN(payload.unitCost)) payload.unitCost = 0;
    if (typeof payload.reorderPoint !== 'number' || Number.isNaN(payload.reorderPoint)) payload.reorderPoint = 0;
    if (typeof payload.reorderThreshold === 'number' && Number.isNaN(payload.reorderThreshold)) {
      delete payload.reorderThreshold;
    }

    if (!payload.vendor || (typeof payload.vendor === 'string' && payload.vendor.trim() === '')) {
      delete payload.vendor;
    }

    if (!payload.lastRestockDate || (typeof payload.lastRestockDate === 'string' && payload.lastRestockDate.trim() === '')) {
      delete payload.lastRestockDate;
    }

    if (!payload.lastOrderDate || (typeof payload.lastOrderDate === 'string' && payload.lastOrderDate.trim() === '')) {
      delete payload.lastOrderDate;
    }

    if (partImage) {
      try {
        payload.image = await fileToDataUrl(partImage);
      } catch (err) {
        console.error('Failed to read part image', err);
      }
    }

    await onUpdate({ data: payload });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={part ? 'Edit Part' : 'Add New Part'}
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                SKU
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.sku}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              rows={3}
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Category
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Location
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Quantity
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Unit Cost
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.unitCost}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Reorder Point
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.reorderPoint}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.reorderThreshold}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, reorderThreshold: parseInt(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Last Restock Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.lastRestockDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lastRestockDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Vendor
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.vendor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Last Order Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                value={formData.lastOrderDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lastOrderDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Part Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md text-white">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-white" />
                <div className="flex text-sm text-white">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-white hover:text-white/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-white"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPartImage(e.target.files?.[0] || null)}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-white">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-white" role="alert">
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
