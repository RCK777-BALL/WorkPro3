/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import SlideOver from '@/components/common/SlideOver';
import { useScopeContext } from '@/context/ScopeContext';
import { useToast } from '@/context/ToastContext';
import { createStation, listDepartments, listLines } from '@/api/departments';
import http from '@/lib/http';

interface StationResponse {
  _id: string;
  name: string;
  lineId: string;
  departmentId: string;
  notes?: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface LineOption {
  id: string;
  name: string;
}

const Stations: React.FC = () => {
  const { addToast } = useToast();
  const { activePlant } = useScopeContext();
  const [stations, setStations] = useState<StationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [stationName, setStationName] = useState('');
  const [stationNotes, setStationNotes] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [stationTouched, setStationTouched] = useState(false);
  const [stationSaving, setStationSaving] = useState(false);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get<StationResponse[]>('/stations');
      setStations(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load stations', err);
      setError('Unable to load stations for this plant');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const response = await listDepartments();
      setDepartments(
        response.map((department) => ({
          id: department._id,
          name: department.name,
        })),
      );
    } catch (err) {
      console.error('Failed to load departments', err);
      addToast('Unable to load departments', 'error');
    } finally {
      setDepartmentsLoading(false);
    }
  }, [addToast]);

  const fetchLines = useCallback(
    async (departmentId: string) => {
      if (!departmentId) {
        setLines([]);
        return;
      }
      setLinesLoading(true);
      try {
        const response = await listLines(departmentId);
        setLines(
          response.map((line) => ({
            id: line._id,
            name: line.name,
          })),
        );
      } catch (err) {
        console.error('Failed to load lines', err);
        addToast('Unable to load lines', 'error');
      } finally {
        setLinesLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    void fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    if (!stationModalOpen) return;
    void fetchDepartments();
  }, [fetchDepartments, stationModalOpen]);

  useEffect(() => {
    if (!stationModalOpen || !selectedDepartmentId) return;
    void fetchLines(selectedDepartmentId);
  }, [fetchLines, selectedDepartmentId, stationModalOpen]);

  const resetStationForm = useCallback(() => {
    setStationName('');
    setStationNotes('');
    setSelectedDepartmentId('');
    setSelectedLineId('');
    setStationTouched(false);
    setLines([]);
  }, []);

  const handleStationSave = async () => {
    if (!stationName.trim() || !selectedDepartmentId || !selectedLineId) {
      setStationTouched(true);
      return;
    }

    setStationSaving(true);
    try {
      await createStation(
        selectedDepartmentId,
        selectedLineId,
        { name: stationName.trim(), notes: stationNotes.trim() || undefined },
        { plantId: activePlant?.id },
      );
      addToast('Station created', 'success');
      setStationModalOpen(false);
      resetStationForm();
      void fetchStations();
    } catch (err) {
      console.error('Failed to create station', err);
      addToast('Unable to create station', 'error');
    } finally {
      setStationSaving(false);
    }
  };

  const departmentError = useMemo(() => {
    if (!stationTouched) return null;
    return selectedDepartmentId ? null : 'Department is required';
  }, [stationTouched, selectedDepartmentId]);

  const lineError = useMemo(() => {
    if (!stationTouched) return null;
    return selectedLineId ? null : 'Line is required';
  }, [stationTouched, selectedLineId]);

  const stationNameError = useMemo(() => {
    if (!stationTouched) return null;
    return stationName.trim() ? null : 'Station name is required';
  }, [stationName, stationTouched]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Stations</h1>
          <p className="text-sm text-neutral-400">
            Explore stations grouped under the currently selected plant.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setStationModalOpen(true);
            resetStationForm();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Station
        </Button>
      </header>
      <Card title="Station directory">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700 text-sm text-neutral-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Station</th>
                  <th className="px-3 py-2 text-left font-medium">Line</th>
                  <th className="px-3 py-2 text-left font-medium">Department</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={4}>
                      Loading stations…
                    </td>
                  </tr>
                ) : (
                  stations.map((station) => (
                    <tr key={station._id}>
                      <td className="px-3 py-3 font-medium text-white">{station.name}</td>
                      <td className="px-3 py-3">{station.lineId}</td>
                      <td className="px-3 py-3">{station.departmentId}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="xs" variant="outline">
                            Edit
                          </Button>
                          <Button size="xs" variant="destructive">
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && stations.length === 0 && !error ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={4}>
                      No stations available for this plant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver
        open={stationModalOpen}
        title="Add Station"
        onClose={() => {
          if (stationSaving) return;
          setStationModalOpen(false);
        }}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStationModalOpen(false)} disabled={stationSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleStationSave} loading={stationSaving}>
              Save
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleStationSave();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(event) => {
                setSelectedDepartmentId(event.target.value);
                setSelectedLineId('');
              }}
              onBlur={() => setStationTouched(true)}
              disabled={departmentsLoading}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {departmentError && <p className="mt-1 text-sm text-error-600">{departmentError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Line
            </label>
            <select
              value={selectedLineId}
              onChange={(event) => setSelectedLineId(event.target.value)}
              onBlur={() => setStationTouched(true)}
              disabled={!selectedDepartmentId || linesLoading}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">
                {selectedDepartmentId ? (linesLoading ? 'Loading lines...' : 'Select line') : 'Select department first'}
              </option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
            {lineError && <p className="mt-1 text-sm text-error-600">{lineError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Station name
            </label>
            <input
              value={stationName}
              onChange={(event) => setStationName(event.target.value)}
              onBlur={() => setStationTouched(true)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Station 3"
            />
            {stationNameError && <p className="mt-1 text-sm text-error-600">{stationNameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Notes
            </label>
            <textarea
              value={stationNotes}
              onChange={(event) => setStationNotes(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              rows={3}
              placeholder="Optional details for this station"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
};

export default Stations;
