/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import Button from '../common/Button';

import Modal from './Modal';

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface StationFormState {
  id: string;
  name: string;
  notes: string;
}

interface LineFormState {
  id: string;
  name: string;
  notes: string;
  stationIncrement: number;
  stations: StationFormState[];
}

interface DepartmentFormState {
  name: string;
  notes: string;
  lines: LineFormState[];
}

export interface DepartmentHierarchyFormValues {
  name: string;
  notes: string;
  lines: Array<{
    name: string;
    notes: string;
    stations: Array<{ name: string; notes: string }>;
  }>;
}

interface DepartmentModalInitialData {
  name?: string;
  notes?: string;
  lines?: Array<{
    id?: string;
    _id?: string;
    name?: string;
    notes?: string;
    stations?: Array<{
      id?: string;
      _id?: string;
      name?: string;
      notes?: string;
    }>;
  }>;
}

interface DepartmentModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: DepartmentModalInitialData;
  onSubmit: (form: DepartmentHierarchyFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  loading?: boolean;
}

const emptyForm: DepartmentFormState = {
  name: '',
  notes: '',
  lines: [],
};

const createStationState = (station?: { id?: string; _id?: string; name?: string; notes?: string }): StationFormState => ({
  id: station?.id ?? station?._id ?? createId(),
  name: station?.name ?? '',
  notes: station?.notes ?? '',
});

const extractStationNumbers = (stations: StationFormState[]): number[] =>
  stations
    .map((station) => {
      const match = station.name.match(/(\d+)\s*$/);
      if (!match) return undefined;
      const value = Number.parseInt(match[1], 10);
      return Number.isNaN(value) ? undefined : value;
    })
    .filter((value): value is number => typeof value === 'number');

const inferStationIncrement = (stations: StationFormState[]): number => {
  const numbers = extractStationNumbers(stations).sort((a, b) => a - b);
  if (numbers.length < 2) return 1;

  let minDiff = Number.POSITIVE_INFINITY;
  for (let index = 1; index < numbers.length; index += 1) {
    const diff = numbers[index] - numbers[index - 1];
    if (diff > 0) {
      minDiff = Math.min(minDiff, diff);
    }
  }

  return Number.isFinite(minDiff) && minDiff > 0 ? minDiff : 1;
};

const createLineState = (line?: { id?: string; _id?: string; name?: string; notes?: string; stations?: { id?: string; _id?: string; name?: string; notes?: string }[] }): LineFormState => {
  const stations = (line?.stations ?? []).map((station) => createStationState(station));

  return {
    id: line?.id ?? line?._id ?? createId(),
    name: line?.name ?? '',
    notes: line?.notes ?? '',
    stationIncrement: inferStationIncrement(stations),
    stations,
  };
};

const getNextStationNumber = (stations: StationFormState[], increment: number): number => {
  const numbers = extractStationNumbers(stations);
  if (!numbers.length) return increment;
  const highest = numbers.reduce((max, value) => Math.max(max, value), 0);
  return highest + increment;
};

const getDefaultStationName = (line: LineFormState) => {
  const prefix = line.name.trim() ? `${line.name.trim()} Station` : 'Station';
  const increment = Number.isFinite(line.stationIncrement) && line.stationIncrement > 0 ? line.stationIncrement : 1;
  const nextNumber = getNextStationNumber(line.stations, increment);
  const padded = nextNumber < 10 ? nextNumber.toString().padStart(2, '0') : nextNumber.toString();
  return `${prefix} ${padded}`;
};

const DepartmentModal = ({
  isOpen,
  mode,
  initialData,
  onSubmit,
  onDelete,
  onClose,
  loading = false,
}: DepartmentModalProps) => {
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialData?.name ?? '',
        notes: initialData?.notes ?? '',
        lines: (initialData?.lines ?? []).map((line) => createLineState(line)),
      });
    }
  }, [isOpen, initialData]);

  const isEditMode = mode === 'edit';
  const canModifyHierarchy = !isEditMode;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) return;

    const sanitizedLines = canModifyHierarchy
      ? form.lines
        .map((line) => ({
          name: line.name.trim(),
          notes: line.notes.trim(),
          stations: line.stations
            .map((station) => ({
              name: station.name.trim(),
              notes: station.notes.trim(),
            }))
            .filter((station) => station.name.length > 0),
        }))
        .filter((line) => line.name.length > 0)
      : [];

    await onSubmit({
      name: trimmedName,
      notes: form.notes.trim(),
      lines: sanitizedLines,
    });
  };

  const handleAddLine = () => {
    if (!canModifyHierarchy) return;
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: createId(),
          name: '',
          notes: '',
          stationIncrement: 1,
          stations: [],
        },
      ],
    }));
  };

  const handleRemoveLine = (lineId: string) => {
    if (!canModifyHierarchy) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== lineId),
    }));
  };

  const handleLineNameChange = (lineId: string, name: string) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId
          ? {
            ...line,
            name,
          }
          : line,
      ),
    }));
  };

  const handleStationIncrementChange = (lineId: string, increment: number) => {
    if (!canModifyHierarchy) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId
          ? {
            ...line,
            stationIncrement: increment > 0 ? increment : 1,
          }
          : line,
      ),
    }));
  };

  const handleAddStation = (lineId: string) => {
    if (!canModifyHierarchy) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line.id !== lineId) return line;
        const newStation: StationFormState = {
          id: createId(),
          name: getDefaultStationName(line),
          notes: '',
        };
        return {
          ...line,
          stations: [...line.stations, newStation],
        };
      }),
    }));
  };

  const handleRemoveStation = (lineId: string, stationId: string) => {
    if (!canModifyHierarchy) return;
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId
          ? {
            ...line,
            stations: line.stations.filter((station) => station.id !== stationId),
          }
          : line,
      ),
    }));
  };

  const handleStationNameChange = (lineId: string, stationId: string, name: string) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId
          ? {
            ...line,
            stations: line.stations.map((station) =>
              station.id === stationId
                ? {
                  ...station,
                  name,
                }
                : station,
            ),
          }
          : line,
      ),
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add Department' : 'Edit Department'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium text-slate-700">Department name</label>
            <input
              className="w-full px-3 py-2 text-sm bg-white border rounded-md border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              placeholder="Body Shop"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-white border rounded-md resize-none h-28 border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Optional notes about this department"
            />
          </div>
        </div>

        <div className="p-4 border rounded-lg border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Lines &amp; stations</h3>
              <p className="mt-1 text-xs text-slate-500">
                {canModifyHierarchy
                  ? 'Add production lines and their stations to build this department hierarchy.'
                  : 'Hierarchy editing is managed from the lines and stations panels.'}
              </p>
            </div>
            {canModifyHierarchy && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<PlusCircle className="w-4 h-4" />}
                className="font-semibold"
                onClick={handleAddLine}
              >
                Add Line
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {form.lines.map((line, index) => (
              <div
                key={line.id}
                className="p-4 space-y-4 bg-white border rounded-md shadow-sm border-slate-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block mb-1 text-xs font-semibold tracking-wide uppercase text-slate-500">
                      Line {index + 1}
                    </label>
                    <input
                      className="w-full px-3 py-2 text-sm bg-white border rounded-md border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                      value={line.name}
                      onChange={(event) => handleLineNameChange(line.id, event.target.value)}
                      placeholder="Line name"
                      disabled={isEditMode}
                    />
                  </div>
                  {canModifyHierarchy && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      className="p-2 mt-6 transition border rounded-md border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-3 border rounded-md border-slate-100 bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                        Stations
                      </span>
                      {canModifyHierarchy && (
                        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Increment
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={line.stationIncrement}
                            onChange={(event) =>
                              handleStationIncrementChange(
                                line.id,
                                Number.parseInt(event.target.value, 10) || 1,
                              )
                            }
                            className="w-20 h-8 px-2 text-xs font-semibold bg-white border rounded border-slate-300 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </label>
                      )}
                    </div>
                    {canModifyHierarchy && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<PlusCircle className="w-4 h-4" />}
                        className="font-semibold"
                        onClick={() => handleAddStation(line.id)}
                      >
                        Add Station
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    {line.stations.map((station, stationIndex) => (
                      <div key={station.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Station {stationIndex + 1}
                          </label>
                          <input
                            className="w-full px-3 py-2 text-sm bg-white border rounded-md border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                            value={station.name}
                            onChange={(event) =>
                              handleStationNameChange(line.id, station.id, event.target.value)
                            }
                            placeholder="Station name"
                            disabled={isEditMode}
                          />
                        </div>
                        {canModifyHierarchy && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStation(line.id, station.id)}
                            className="p-2 mt-5 transition border rounded-md border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Remove station"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {line.stations.length === 0 && (
                      <p className="text-xs text-slate-500">
                        {canModifyHierarchy
                          ? 'No stations added yet. Add the first station to this line.'
                          : 'No stations available for this line.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {form.lines.length === 0 && (
              <p className="text-xs text-slate-500">
                {canModifyHierarchy
                  ? 'No lines added yet. Use the Add Line button to start building the hierarchy.'
                  : 'This department does not have any lines yet.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          {mode === 'edit' && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-rose-500 hover:bg-rose-50"
              onClick={() => onDelete()}
              disabled={loading}
            >
              Delete Department
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading} loading={loading}>
              {mode === 'create' ? 'Create Department' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DepartmentModal;
