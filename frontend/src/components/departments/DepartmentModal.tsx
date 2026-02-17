/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import SlideOver from '@/components/common/SlideOver';
import Button from '@/components/common/Button';
import type { DepartmentHierarchy, PlantSummary } from '@/types';
import http from '@/lib/http';

export type DepartmentFormStation = {
  id?: string;
  name: string;
  key: string;
};

export type DepartmentFormLine = {
  id?: string;
  name: string;
  key: string;
  stations: DepartmentFormStation[];
};

export type DepartmentFormValues = {
  name: string;
  description?: string | null;
  plantId: string;
  plant?: PlantSummary;
  lines: DepartmentFormLine[];
};

interface DepartmentModalProps {
  open: boolean;
  initial?: DepartmentHierarchy | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (values: DepartmentFormValues) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

const DepartmentModal = ({
  open,
  initial,
  loading = false,
  onClose,
  onSave,
  onDelete,
}: DepartmentModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [lines, setLines] = useState<DepartmentFormLine[]>([]);
  const [lineErrors, setLineErrors] = useState<string[]>([]);
  const [stationErrors, setStationErrors] = useState<string[][]>([]);
  const [plantId, setPlantId] = useState('');
  const [plants, setPlants] = useState<
    Array<{ id: string; name: string; location?: string; description?: string }>
  >([]);
  const [plantsLoading, setPlantsLoading] = useState(false);
  const [plantTouched, setPlantTouched] = useState(false);
  const [plantLoadError, setPlantLoadError] = useState<string | null>(null);

  const generateKey = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setTouched(false);
    setPlantTouched(false);
    const mappedLines = (initial?.lines ?? []).map((line) => ({
      id: line.id,
      name: line.name,
      key: line.id,
      stations: line.stations.map((station) => ({
        id: station.id,
        name: station.name,
        key: station.id,
      })),
    }));
    setLines(mappedLines);
    setLineErrors(mappedLines.map(() => ''));
    setStationErrors(mappedLines.map((line) => line.stations.map(() => '')));
    setPlantId(initial?.plant?.id ?? '');
  }, [initial, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setPlantsLoading(true);
    setPlantLoadError(null);
    void http
      .get<Array<{ _id: string; name: string; location?: string; description?: string }>>('/plants')
      .then((response) => {
        if (!active) return;
        const options = response.data.map((plant) => ({
          id: plant._id,
          name: plant.name,
          location: plant.location,
          description: plant.description,
        }));
        const currentPlantId = initial?.plant?.id ?? '';
        if (currentPlantId && !options.some((option) => option.id === currentPlantId)) {
          options.unshift({
            id: currentPlantId,
            name: initial?.plant?.name ?? 'Current Plant',
            location: initial?.plant?.location,
            description: initial?.plant?.description,
          });
        }
        setPlants(options);
        if (currentPlantId) {
          setPlantId(currentPlantId);
        } else if (options.length > 0) {
          setPlantId(options[0].id);
        } else {
          setPlantId('');
        }
      })
      .catch(() => {
        if (!active) return;
        setPlantLoadError('Unable to load plants');
        setPlants([]);
        setPlantId('');
      })
      .finally(() => {
        if (!active) return;
        setPlantsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initial, open]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) {
      setTouched(true);
      return;
    }
    if (!plantId) {
      setPlantTouched(true);
      return;
    }
    const trimmedLines = lines.map((line) => ({
      ...line,
      name: line.name.trim(),
      stations: line.stations.map((station) => ({
        ...station,
        name: station.name.trim(),
      })),
    }));
    const lineNameErrors = trimmedLines.map((line) => (line.name ? '' : 'Line name is required'));
    const stationNameErrors = trimmedLines.map((line) =>
      line.stations.map((station) => (station.name ? '' : 'Station name is required')),
    );
    setLineErrors(lineNameErrors);
    setStationErrors(stationNameErrors);
    if (lineNameErrors.some((error) => error)) {
      return;
    }
    if (stationNameErrors.some((stationLineErrors) => stationLineErrors.some((error) => error))) {
      return;
    }

    const selectedPlant = plants.find((plant) => plant.id === plantId);

    const trimmedDescription = description.trim();
    const normalizedDescription = trimmedDescription.length > 0 ? trimmedDescription : null;

    void onSave({
      name: name.trim(),
      description: normalizedDescription,
      plantId,
      plant: selectedPlant
        ? {
            id: selectedPlant.id,
            name: selectedPlant.name,
            location: selectedPlant.location,
            description: selectedPlant.description,
          }
        : undefined,
      lines: trimmedLines.map(({ id, key, name, stations }) => ({
        id,
        key,
        name,
        stations: stations.map(({ id: stationId, key: stationKey, name: stationName }) => ({
          id: stationId,
          key: stationKey,
          name: stationName,
        })),
      })),
    });
  };

  const error = touched && !name.trim() ? 'Name is required' : null;
  const plantError = (plantTouched || touched) && !plantId ? 'Plant is required' : null;

  const handleLineChange = (index: number, value: string) => {
    setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, name: value } : line)));
    setLineErrors((prev) =>
      prev.map((lineError, lineIndex) => (lineIndex === index && value.trim() ? '' : lineError)),
    );
  };

  const handleLineBlur = (index: number) => {
    setLineErrors((prev) =>
      prev.map((lineError, lineIndex) =>
        lineIndex === index ? (lines[index]?.name.trim() ? '' : 'Line name is required') : lineError,
      ),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, { key: generateKey(), name: '', stations: [] }]);
    setLineErrors((prev) => [...prev, '']);
    setStationErrors((prev) => [...prev, []]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    setLineErrors((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    setStationErrors((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  const handleAddStation = (lineIndex: number) => {
    setLines((prev) =>
      prev.map((line, currentIndex) =>
        currentIndex === lineIndex
          ? { ...line, stations: [...line.stations, { key: generateKey(), name: '' }] }
          : line,
      ),
    );
    setStationErrors((prev) => {
      const next = [...prev];
      const currentLineErrors = next[lineIndex] ? [...next[lineIndex]] : [];
      next[lineIndex] = [...currentLineErrors, ''];
      return next;
    });
  };

  const handleRemoveStation = (lineIndex: number, stationIndex: number) => {
    setLines((prev) =>
      prev.map((line, currentIndex) =>
        currentIndex === lineIndex
          ? {
              ...line,
              stations: line.stations.filter((_, currentStationIndex) => currentStationIndex !== stationIndex),
            }
          : line,
      ),
    );
    setStationErrors((prev) => {
      const next = [...prev];
      const currentLineErrors = next[lineIndex] ? [...next[lineIndex]] : [];
      currentLineErrors.splice(stationIndex, 1);
      next[lineIndex] = currentLineErrors;
      return next;
    });
  };

  const handleStationChange = (lineIndex: number, stationIndex: number, value: string) => {
    setLines((prev) =>
      prev.map((line, currentIndex) =>
        currentIndex === lineIndex
          ? {
              ...line,
              stations: line.stations.map((station, currentStationIndex) =>
                currentStationIndex === stationIndex ? { ...station, name: value } : station,
              ),
            }
          : line,
      ),
    );
    setStationErrors((prev) => {
      const next = [...prev];
      const currentLineErrors = next[lineIndex] ? [...next[lineIndex]] : [];
      if (value.trim()) {
        currentLineErrors[stationIndex] = '';
      }
      next[lineIndex] = currentLineErrors;
      return next;
    });
  };

  const handleStationBlur = (lineIndex: number, stationIndex: number) => {
    setStationErrors((prev) => {
      const next = [...prev];
      const currentLineErrors = next[lineIndex] ? [...next[lineIndex]] : [];
      currentLineErrors[stationIndex] = lines[lineIndex]?.stations[stationIndex]?.name.trim()
        ? ''
        : 'Station name is required';
      next[lineIndex] = currentLineErrors;
      return next;
    });
  };

  return (
    <SlideOver
      open={open}
      title={`${initial ? 'Edit Department' : 'Add Department'}`}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                void onDelete();
              }}
              loading={loading}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              loading={loading}
            >
              Save
            </Button>
          </div>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            Plant<span className="text-error-500">*</span>
          </label>
          <select
            value={plantId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setPlantId(event.target.value);
              setPlantTouched(true);
            }}
            className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[var(--wp-color-text)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
            disabled={plantsLoading || plants.length === 0}
          >
            <option value="" disabled>
              {plantsLoading ? 'Loading plants…' : 'Select plant'}
            </option>
            {plants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </select>
          {plantLoadError && (
            <p className="mt-1 text-sm text-error-600">{plantLoadError}</p>
          )}
          {!plantLoadError && plantError && (
            <p className="mt-1 text-sm text-error-600">{plantError}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            Name
          </label>
          <input
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[var(--wp-color-text)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
            placeholder="Department name"
          />
          {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(event.target.value)
            }
            className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[var(--wp-color-text)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
            rows={4}
            placeholder="Describe the department"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Lines</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddLine}
              className="-mr-2"
              disabled={loading}
            >
              Add Line
            </Button>
          </div>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
              No lines added yet.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="space-y-3 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-3 dark:border-[var(--wp-color-border)] dark:bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)]"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text-muted)]">
                        Line Name
                      </label>
                      <input
                        value={line.name}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleLineChange(index, event.target.value)
                        }
                        onBlur={() => handleLineBlur(index)}
                        className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[var(--wp-color-text)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
                        placeholder="Line name"
                      />
                      {lineErrors[index] && (
                        <p className="mt-1 text-sm text-error-600">{lineErrors[index]}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium uppercase tracking-wide text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                        Stations
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddStation(index)}
                        disabled={loading}
                      >
                        Add Station
                      </Button>
                    </div>
                    {line.stations.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                        No stations added yet.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {line.stations.map((station, stationIndex) => (
                          <div key={station.key} className="space-y-1">
                            <div className="flex items-start gap-2">
                              <input
                                value={station.name}
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                  handleStationChange(index, stationIndex, event.target.value)
                                }
                                onBlur={() => handleStationBlur(index, stationIndex)}
                                className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-[var(--wp-color-text)] dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface)] dark:text-[var(--wp-color-text)]"
                                placeholder="Station name"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStation(index, stationIndex)}
                                disabled={loading}
                              >
                                Remove
                              </Button>
                            </div>
                            {stationErrors[index]?.[stationIndex] && (
                              <p className="text-sm text-error-600">{stationErrors[index]?.[stationIndex]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </SlideOver>
  );
};

export default DepartmentModal;

