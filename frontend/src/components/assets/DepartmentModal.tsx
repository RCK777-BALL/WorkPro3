/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash } from 'lucide-react';
import Button from '../common/Button';
import type { DepartmentHierarchy, Asset } from '../../types';
import { useToast } from '../../context/ToastContext';

export type { DepartmentHierarchy } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentHierarchy | null;
  onUpdate: (dep: DepartmentHierarchy) => void;
  loading?: boolean;
}

const defaultDepartment: DepartmentHierarchy = {
  id: '',
  name: '',
  lines: [],
};

 
const DepartmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  department,
  onUpdate,
  loading = false,
}) => {
 
  const [formData, setFormData] = useState<DepartmentHierarchy>(department || defaultDepartment);

  useEffect(() => {
    setFormData(department || defaultDepartment);
  }, [department]);

  const addLine = () => {
    const newLine = {
      id: `${Date.now()}-${Math.random()}`,
      name: '',
      department: formData.id,
      stations: [],
    };
    setFormData({ ...formData, lines: [...formData.lines, newLine] });
  };

  const removeLine = (lineIndex: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== lineIndex),
    });
  };

  const updateLine = (lineIndex: number, name: string) => {
    const lines = [...formData.lines];
    lines[lineIndex].name = name;
    setFormData({ ...formData, lines });
  };

  const addStation = (lineIndex: number) => {
    const line = formData.lines[lineIndex];
    const newStation = {
      id: `${Date.now()}-${Math.random()}`,
      name: '',
      line: line.id,
      assets: [],
    };
    const lines = [...formData.lines];
    lines[lineIndex] = { ...line, stations: [...line.stations, newStation] };
    setFormData({ ...formData, lines });
  };

  const removeStation = (lineIndex: number, stationIndex: number) => {
    const lines = [...formData.lines];
    lines[lineIndex].stations = lines[lineIndex].stations.filter((_, i) => i !== stationIndex);
    setFormData({ ...formData, lines });
  };

  const updateStation = (lineIndex: number, stationIndex: number, name: string) => {
    const lines = [...formData.lines];
    lines[lineIndex].stations[stationIndex].name = name;
    setFormData({ ...formData, lines });
  };

  const addAsset = (lineIndex: number, stationIndex: number) => {
    const lines = [...formData.lines];
    const station = lines[lineIndex].stations[stationIndex];
    const newAsset: Asset = {
      id: `${Date.now()}-${Math.random()}`,
      name: '',
      line: lines[lineIndex].id,
      station: station.id,
      type: 'Electrical',
      location: '',
      status: 'Active',
    };
    station.assets = [...station.assets, newAsset];
    lines[lineIndex].stations[stationIndex] = station;
    setFormData({ ...formData, lines });
  };

  const removeAsset = (lineIndex: number, stationIndex: number, assetIndex: number) => {
    const lines = [...formData.lines];
    lines[lineIndex].stations[stationIndex].assets =
      lines[lineIndex].stations[stationIndex].assets.filter((_, i) => i !== assetIndex);
    setFormData({ ...formData, lines });
  };

  const updateAsset = (
    lineIndex: number,
    stationIndex: number,
    assetIndex: number,
    updates: Partial<Asset>
  ) => {
    const lines = [...formData.lines];
    const asset = lines[lineIndex].stations[stationIndex].assets[assetIndex];
    lines[lineIndex].stations[stationIndex].assets[assetIndex] = {
      ...asset,
      ...updates,
    };
    setFormData({ ...formData, lines });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const line of formData.lines) {
      for (const station of line.stations) {
        for (const asset of station.assets) {
          if (!asset.name || asset.name.trim() === '') {
            addToast('Asset name is required', 'error');
            return;
          }
        }
      }
    }

    onUpdate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {department ? 'Edit Department' : 'Create Department'}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Lines</h3>
              <Button variant="ghost" size="sm" icon={<PlusCircle size={16} />} onClick={addLine}>
                Add Line
              </Button>
            </div>

            {formData.lines.map((line, li) => (
              <div key={li} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md"
                    value={line.name}
                    onChange={(e) => updateLine(li, e.target.value)}
                    placeholder="Line name"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(li)}
                    className="text-error-500 hover:text-error-600"
                  >
                    <Trash size={18} />
                  </button>
                </div>

                <div className="space-y-3 ml-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-700">Stations</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<PlusCircle size={16} />}
                      onClick={() => addStation(li)}
                    >
                      Add Station
                    </Button>
                  </div>

                  {line.stations.map((st, si) => (
                    <div key={si} className="border rounded-md p-3 space-y-2 ml-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md"
                          value={st.name}
                          onChange={(e) => updateStation(li, si, e.target.value)}
                          placeholder="Station name"
                        />
                        <button
                          type="button"
                          onClick={() => removeStation(li, si)}
                          className="text-error-500 hover:text-error-600"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      <div className="space-y-2 ml-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-700 font-medium">Assets</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<PlusCircle size={16} />}
                            onClick={() => addAsset(li, si)}
                          >
                            Add Asset
                          </Button>
                        </div>
                        {st.assets.map((a, ai) => (
                          <div key={ai} className="space-y-2 ml-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md"
                                value={a.name}
                                onChange={(e) =>
                                  updateAsset(li, si, ai, { name: e.target.value })
                                }
                                placeholder="Asset name"
                              />
                              <button
                                type="button"
                                onClick={() => removeAsset(li, si, ai)}
                                className="text-error-500 hover:text-error-600"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                className="px-3 py-1.5 border border-neutral-300 rounded-md"
                                value={a.type}
                                onChange={(e) =>
                                  updateAsset(li, si, ai, {
                                    type: e.target.value as Asset['type'],
                                  })
                                }
                              >
                                <option value="Electrical">Electrical</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Tooling">Tooling</option>
                                <option value="Interface">Interface</option>
                              </select>
                              <input
                                type="text"
                                className="px-3 py-1.5 border border-neutral-300 rounded-md"
                                value={a.location}
                                onChange={(e) =>
                                  updateAsset(li, si, ai, { location: e.target.value })
                                }
                                placeholder="Location"
                              />
                              <select
                                className="px-3 py-1.5 border border-neutral-300 rounded-md"
                                value={a.status}
                                onChange={(e) =>
                                  updateAsset(li, si, ai, {
                                    status: e.target.value as Asset['status'],
                                  })
                                }
                              >
                                <option value="Active">Active</option>
                                <option value="Offline">Offline</option>
                                <option value="In Repair">In Repair</option>
                              </select>
                            </div>
                          </div>
                        ))}
                        {st.assets.length === 0 && (
                          <p className="text-neutral-500 text-sm ml-2">No assets</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {line.stations.length === 0 && (
                    <p className="text-neutral-500 text-sm ml-2">No stations</p>
                  )}
                </div>
              </div>
            ))}

            {formData.lines.length === 0 && (
              <p className="text-neutral-500 text-sm">No lines</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {department ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;
