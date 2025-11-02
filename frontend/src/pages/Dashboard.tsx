/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Group, Title, Select, TextInput, Button, Text, Loader } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from "@tabler/icons-react";

import http, { SITE_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

type SelectOption = { value: string; label: string };

type SummaryMetrics = {
  totalWorkOrders: number;
  pmCount: number;
  assetCount: number;
  teamCount: number;
};

type SummaryResponse = SummaryMetrics & Record<string, unknown>;

type DepartmentResponse = { _id: string; name: string };
type LineResponse = { _id: string; name: string };

type CardDefinition = {
  key: keyof SummaryMetrics;
  label: string;
  route: string;
  gradient: string;
  keywords: string[];
};

const CARD_DEFINITIONS: CardDefinition[] = [
  {
    key: 'totalWorkOrders',
    label: 'Work Orders',
    route: '/workorders',
    gradient: 'linear-gradient(90deg,#ff6b6b,#f06595)',
    keywords: ['wo', 'orders', 'work order'],
  },
  {
    key: 'pmCount',
    label: 'Preventive Maintenance',
    route: '/maintenance',
    gradient: 'linear-gradient(90deg,#845ef7,#5c7cfa)',
    keywords: ['pm', 'preventive', 'maintenance'],
  },
  {
    key: 'assetCount',
    label: 'Assets',
    route: '/assets',
    gradient: 'linear-gradient(90deg,#38d9a9,#20c997)',
    keywords: ['equipment', 'machines'],
  },
  {
    key: 'teamCount',
    label: 'Active Teams',
    route: '/teams',
    gradient: 'linear-gradient(90deg,#228be6,#4dabf7)',
    keywords: ['team', 'crew', 'technician'],
  },
];

const fuzzyIncludes = (needleRaw: string, haystackRaw: string): boolean => {
  const needle = needleRaw.replace(/\s+/g, '').toLowerCase();
  const haystack = haystackRaw.replace(/\s+/g, '').toLowerCase();
  if (!needle) return false;
  let position = 0;
  for (const char of needle) {
    position = haystack.indexOf(char, position);
    if (position === -1) {
      return false;
    }
    position += 1;
  }
  return true;
};

const formatNumber = (value: number | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString();
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<SelectOption[]>([]);
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [lines, setLines] = useState<SelectOption[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [readyForSummary, setReadyForSummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const [plantRes, settingsRes] = await Promise.all([
          http.get<Array<{ _id: string; name: string }>>('/plants'),
          http.get<{ activePlant?: string }>('/settings'),
        ]);
        if (cancelled) return;

        const plantOptions = plantRes.data.map((plant) => ({ value: plant._id, label: plant.name }));
        setPlants(plantOptions);

        const storedPlant = safeLocalStorage.getItem(SITE_KEY);
        let nextPlant = settingsRes.data.activePlant ?? storedPlant ?? null;
        if (nextPlant && !plantOptions.some((option) => option.value === nextPlant)) {
          nextPlant = plantOptions[0]?.value ?? null;
        }
        if (!nextPlant && plantOptions.length > 0) {
          nextPlant = plantOptions[0].value;
        }
        if (nextPlant) {
          safeLocalStorage.setItem(SITE_KEY, nextPlant);
        }
        setSelectedPlant(nextPlant);
      } catch (error) {
        console.error('Dashboard load error:', error);
        setPlants([]);
        setSelectedPlant(null);
      } finally {
        if (!cancelled) {
          setReadyForSummary(true);
        }
      }
    };

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedPlant) {
      setDepartments([]);
      setSelectedDepartment(null);
      setLines([]);
      setSelectedLine(null);
      return;
    }

    setDepartmentsLoading(true);
    const loadDepartments = async () => {
      try {
        const response = await http.get<DepartmentResponse[]>(`/departments/plant/${selectedPlant}`);
        if (cancelled) return;
        const options = response.data.map((dept) => ({ value: dept._id, label: dept.name }));
        setDepartments(options);
        setSelectedDepartment((current) =>
          current && options.some((option) => option.value === current) ? current : null,
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load departments', error);
          setDepartments([]);
          setSelectedDepartment(null);
        }
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false);
        }
      }
    };

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [selectedPlant]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedDepartment) {
      setLines([]);
      setSelectedLine(null);
      return;
    }

    setLinesLoading(true);
    const loadLines = async () => {
      try {
        const response = await http.get<LineResponse[]>(`/lines/department/${selectedDepartment}`);
        if (cancelled) return;
        const options = response.data.map((line) => ({ value: line._id, label: line.name }));
        setLines(options);
        setSelectedLine((current) =>
          current && options.some((option) => option.value === current) ? current : null,
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load lines', error);
          setLines([]);
          setSelectedLine(null);
        }
      } finally {
        if (!cancelled) {
          setLinesLoading(false);
        }
      }
    };

    void loadLines();
    return () => {
      cancelled = true;
    };
  }, [selectedDepartment]);

  useEffect(() => {
    if (!readyForSummary) {
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);

    const loadSummary = async () => {
      try {
        const params: Record<string, string> = {};
        if (selectedDepartment) {
          params.department = selectedDepartment;
        }
        if (selectedLine) {
          params.line = selectedLine;
        }
        const response = await http.get<SummaryResponse>('/summary', { params });
        if (cancelled) return;
        setSummary(response.data);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load summary', error);
          setSummary(null);
          setSummaryError('Unable to load global overview.');
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
          setPageLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [readyForSummary, selectedDepartment, selectedLine, selectedPlant]);

  const handlePlantChange = useCallback(
    (value: string | null) => {
      if (value === selectedPlant) {
        return;
      }
      setSelectedPlant(value);
      setSelectedDepartment(null);
      setSelectedLine(null);
      setDepartments([]);
      setLines([]);
      if (value) {
        safeLocalStorage.setItem(SITE_KEY, value);
        void http.post('/global/switch-plant', { plantId: value }).catch((error) => {
          console.error('Failed to switch plant', error);
        });
      } else {
        safeLocalStorage.removeItem(SITE_KEY);
      }
    },
    [selectedPlant],
  );

  const handleDepartmentChange = useCallback((value: string | null) => {
    setSelectedDepartment(value);
    setSelectedLine(null);
  }, []);

  const handleLineChange = useCallback((value: string | null) => {
    setSelectedLine(value);
  }, []);

  const handleSearch = useCallback(() => {
    const term = search.trim();
    if (!term) {
      return;
    }

    const match = CARD_DEFINITIONS.find((card) =>
      [card.label, ...card.keywords].some((keyword) => fuzzyIncludes(term, keyword)),
    );

    if (match) {
      navigate(match.route);
    } else {
      navigate(`/workorders?query=${encodeURIComponent(term)}`);
    }
  }, [navigate, search]);

  useEffect(() => {
    setSearch('');
  }, [selectedPlant, selectedDepartment, selectedLine]);

  const cards = useMemo(
    () =>
      CARD_DEFINITIONS.map((card) => ({
        ...card,
        value: summary ? summary[card.key] : undefined,
      })),
    [summary],
  );

  if (pageLoading) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Operations Dashboard</Title>
          <Text c="dimmed" size="sm">
            Monitor work orders, maintenance, assets, and team activity across plants.
          </Text>
        </div>
        <Group align="center" gap="sm">
          <TextInput
            placeholder="Search work orders, widgets..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            leftSection={<Search size={16} />}
            style={{ minWidth: 260 }}
          />
          <Button onClick={handleSearch}>Search</Button>
        </Group>
      </Group>

      <Group gap="md" justify="flex-start" wrap="wrap">
        <Select
          label="Plant"
          placeholder={plants.length ? 'Select plant' : 'No plants available'}
          data={plants}
          value={selectedPlant}
          onChange={handlePlantChange}
          disabled={plants.length === 0}
          allowDeselect={false}
          style={{ minWidth: 200 }}
        />
        <Select
          label="Department"
          placeholder={departments.length ? 'Select department' : 'No departments'}
          data={departments}
          value={selectedDepartment}
          onChange={handleDepartmentChange}
          disabled={!selectedPlant || departmentsLoading || departments.length === 0}
          allowDeselect
          style={{ minWidth: 200 }}
          rightSection={departmentsLoading ? <Loader size="xs" /> : undefined}
        />
        <Select
          label="Line"
          placeholder={lines.length ? 'Select line' : 'No lines'}
          data={lines}
          value={selectedLine}
          onChange={handleLineChange}
          disabled={!selectedDepartment || linesLoading || lines.length === 0}
          allowDeselect
          style={{ minWidth: 200 }}
          rightSection={linesLoading ? <Loader size="xs" /> : undefined}
        />
      </Group>

      <Card shadow="sm" radius="md" padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Title order={3}>Global Overview</Title>
          <Text size="sm" c="dimmed">
            Live snapshot across selected filters.
          </Text>
        </div>

        {summaryError && (
          <Text c="red" size="sm">
            {summaryError}
          </Text>
        )}

        {summaryLoading && !summary ? (
          <Group justify="center" mt="md">
            <Loader />
          </Group>
        ) : summary ? (
          <div
            style={{
              display: 'grid',
              gap: '16px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {cards.map((card) => (
              <Card
                key={card.key}
                component="button"
                type="button"
                onClick={() => navigate(card.route)}
                shadow="md"
                radius="md"
                style={{
                  backgroundImage: card.gradient,
                  color: 'white',
                  padding: '20px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Text fw={700}>{card.label}</Text>
                  {summaryLoading && <Loader size="xs" color="white" />}
                </Group>
                <Text size="xl" fw={700} mt="xs">
                  {formatNumber(typeof card.value === 'number' ? card.value : undefined)}
                </Text>
              </Card>
            ))}
          </div>
        ) : (
          <Text c="dimmed">No summary data available</Text>
        )}
      </Card>

      <Card shadow="sm" radius="md" padding="lg">
        <Title order={4}>Plant Analytics Summary</Title>
        <Text size="sm" c="dimmed">
          Deep dive analytics for plant performance.
        </Text>
        <iframe
          src="/analytics/global"
          title="Global Analytics"
          style={{
            border: 'none',
            width: '100%',
            height: '600px',
            borderRadius: '12px',
            marginTop: '16px',
          }}
        />
      </Card>
    </div>
  );
}
