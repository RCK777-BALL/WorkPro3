/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Trash } from 'lucide-react';
// lightweight local Button component to avoid external module resolution issues
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'outline' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
};

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', icon, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md';
  const variants: Record<string, string> = {
    primary: 'bg-[var(--wp-color-primary)] text-[var(--wp-color-text)] hover:opacity-90',
    ghost: 'bg-transparent text-[var(--wp-color-text)] hover:bg-[var(--wp-color-surface-elevated)]',
    outline: 'border border-[var(--wp-color-border)] text-[var(--wp-color-text)]',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  return (
    <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

import type { DepartmentHierarchy, Asset } from '@/types';
import { useToast } from '@/context/ToastContext';

const defaultDepartment: DepartmentHierarchy = {
  id: '',
  name: '',
  plant: { id: '', name: '' },
  lines: [],
};


interface Props {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentHierarchy | null;
  onUpdate: (dep: DepartmentHierarchy) => void;
  loading?: boolean;
}



const DepartmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  department,
  onUpdate,
  loading = false,
}) => {

  const { addToast } = useToast();
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

  const getNextStationNumber = (stations: { name: string }[]) => {
    const numericNames = stations
      .map((station) => {
        const match = station.name.match(/St\.?\s*(\d+)/i);
        return match ? Number.parseInt(match[1] ?? '0', 10) : null;
      })
      .filter((value): value is number => value !== null);

    return numericNames.length > 0 ? Math.max(...numericNames) + 1 : 1;
  };

  const formatStationName = (number: number) => `St. ${number}`;

  const addStation = (lineIndex: number, count = 1) => {
    const line = formData.lines[lineIndex];
    const existingNames = new Set(
      line.stations
        .map((station) => station.name?.trim().toLowerCase())
        .filter((name): name is string => Boolean(name))
    );
    let nextNumber = getNextStationNumber(line.stations);

    const newStations = Array.from({ length: count }).map(() => {
      let candidateNumber = nextNumber;
      let candidateName = formatStationName(candidateNumber);

      while (existingNames.has(candidateName.toLowerCase())) {
        candidateNumber += 1;
        candidateName = formatStationName(candidateNumber);
      }

      existingNames.add(candidateName.toLowerCase());
      nextNumber = candidateNumber + 1;

      return {
        id: `${Date.now()}-${Math.random()}`,
        name: candidateName,
        line: line.id,
        assets: [],
      };
    });

    const lines = [...formData.lines];
    lines[lineIndex] = { ...line, stations: [...line.stations, ...newStations] };
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
      tenantId: 'temp-tenant',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wp-color-background)_70%,transparent)]">
      <div className="bg-[var(--wp-color-surface)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--wp-color-border)]">
          <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">
            {department ? 'Edit Department' : 'Create Department'}
          </h2>
          <button onClick={onClose} className="text-[var(--wp-color-text-muted)] hover:text-[var(--wp-color-text)]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div>
            <label className="block mb-1 text-sm font-medium text-[var(--wp-color-text)]">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-[var(--wp-color-surface)] border rounded-md border-[var(--wp-color-border)] text-[var(--wp-color-text)]"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Lines</h3>
              <Button variant="ghost" size="sm" icon={<PlusCircle size={16} />} onClick={addLine}>
                Add Line
              </Button>
            </div>

            {formData.lines.map((line, li) => (
              <div key={li} className="p-3 space-y-3 border rounded-md">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                    value={line.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLine(li, e.target.value)}
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

                <div className="ml-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[var(--wp-color-text)]">Stations</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<PlusCircle size={16} />}
                        onClick={() => addStation(li)}
                      >
                        Add Station
                      </Button>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4, 5, 10].map((count) => (
                          <Button
                            key={count}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addStation(li, count)}
                            className="px-2"
                          >
                            +{count}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {line.stations.map((st, si) => (
                    <div key={si} className="p-3 ml-2 space-y-2 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                          value={st.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStation(li, si, e.target.value)}
                          placeholder="St. 1"
                        />
                        <button
                          type="button"
                          onClick={() => removeStation(li, si)}
                          className="text-error-500 hover:text-error-600"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      <div className="ml-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[var(--wp-color-text)]">Assets</span>
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
                          <div key={ai} className="ml-2 space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                                value={a.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              <select
                                className="px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                                value={a.type}
                              //onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateAsset(li, si, ai, { type: e.target.value})}


                              >
                                <option value="Electrical">Electrical</option>
                                <option value="Mechanical">Mechanical</option>
                                <option value="Tooling">Tooling</option>
                                <option value="Interface">Interface</option>
                              </select>
                              <input
                                type="text"
                                className="px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                                value={a.location}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateAsset(li, si, ai, { location: e.target.value })
                                }
                                placeholder="Location"
                              />
                              <select
                                className="px-3 py-1.5 border border-[var(--wp-color-border)] rounded-md"
                                value={a.status}
                              //onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateAsset(li, si, ai, { status: e.target.value})}


                              >
                                <option value="Active">Active</option>
                                <option value="Offline">Offline</option>
                                <option value="In Repair">In Repair</option>
                              </select>
                            </div>
                          </div>
                        ))}
                        {st.assets.length === 0 && (
                          <p className="ml-2 text-sm text-[var(--wp-color-text-muted)]">No assets</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {line.stations.length === 0 && (
                    <p className="ml-2 text-sm text-[var(--wp-color-text-muted)]">No stations</p>
                  )}
                </div>
              </div>
            ))}

            {formData.lines.length === 0 && (
              <p className="text-sm text-[var(--wp-color-text-muted)]">No lines</p>
            )}
          </div>

          <div className="flex justify-end pt-4 space-x-3 border-t border-[var(--wp-color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" >
              {department ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;

