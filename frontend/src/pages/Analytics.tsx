/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';

type PmRecord = { period: string; compliance: number };
type DowntimeRecord = { period: string; downtime: number };
type CostRecord = { asset: string; cost: number };
type TabKey = 'pm' | 'downtime' | 'cost';

let hasLoggedSearchParamsFallback = false;

const getInitialSearch = () => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.search ?? '';
  }
  return '';
};

type SearchParamsCtorInit = string | string[][] | URLSearchParams;

const toSearchParamsInit = (value: unknown): SearchParamsCtorInit => {
  if (value instanceof URLSearchParams || typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const entries: Array<[string, string]> = [];
    value.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        entries.push([String(item[0]), String(item[1])]);
      }
    });
    return entries;
  }

  if (value && typeof value === 'object') {
    const entries: Array<[string, string]> = [];
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (Array.isArray(entryValue)) {
        entryValue.forEach((item) => entries.push([key, String(item)]));
      } else if (entryValue != null) {
        entries.push([key, String(entryValue)]);
      }
    });
    return entries;
  }

  return [];
};

const useSafeSearchParams = (): ReturnType<typeof useSearchParams> => {
  try {
    return useSearchParams();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedSearchParamsFallback) {
      // eslint-disable-next-line no-console -- surfaced only in non-production environments for debugging
      console.warn(
        'Analytics page is rendering outside of a Router context. Falling back to in-memory search params.',
        error,
      );
      hasLoggedSearchParamsFallback = true;
    }
    const [params, setParams] = useState(() => new URLSearchParams(getInitialSearch()));
    const setFallback: ReturnType<typeof useSearchParams>[1] = (
      nextInit,
      navigateOptions,
    ) => {
      const nextValue =
        typeof nextInit === 'function'
          ? nextInit(new URLSearchParams(params))
          : nextInit;
      const init = toSearchParamsInit(nextValue);
      setParams(new URLSearchParams(init));
      if (navigateOptions?.replace) {
        // no-op in fallback; included to satisfy signature and future extensibility
      }
    };
    return [params, setFallback];
  }
};

export default function Analytics() {
  const [pm, setPm] = useState<PmRecord[]>([]);
  const [downtime, setDowntime] = useState<DowntimeRecord[]>([]);
  const [cost, setCost] = useState<CostRecord[]>([]);
  const [searchParams, setSearchParams] = useSafeSearchParams();
  const [tab, setTab] = useState<TabKey>(() => {
    const param = searchParams.get('tab');
    return param === 'downtime' || param === 'cost' ? param : 'pm';
  });

  useEffect(() => {
    const param = searchParams.get('tab');
    if ((param === 'pm' || param === 'downtime' || param === 'cost') && param !== tab) {
      setTab(param);
    }
  }, [searchParams, tab]);

  const updateTabParam = useCallback(
    (value: TabKey) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pmRes, downRes, costRes] = await Promise.all([
          http.get<PmRecord[]>('/reports/pm-compliance'),
          http.get<DowntimeRecord[]>('/reports/downtime'),
          http.get<CostRecord[]>('/reports/cost-by-asset'),
        ]);
        setPm(Array.isArray(pmRes.data) ? pmRes.data : []);
        setDowntime(Array.isArray(downRes.data) ? downRes.data : []);
        setCost(Array.isArray(costRes.data) ? costRes.data : []);
      } catch (err) {
        console.error('Failed to load analytics', err);
      }
    };
    fetchData();
  }, []);

  const currentData = tab === 'pm' ? pm : tab === 'downtime' ? downtime : cost;

  const handleTabChange = useCallback(
    (value: TabKey) => {
      setTab(value);
      updateTabParam(value);
    },
    [updateTabParam],
  );

  const exportCSV = () => {
    if (!currentData.length) return;
    const headers = Object.keys(currentData[0]);
    const rows = currentData.map((r) =>
      headers.map((h) => String((r as Record<string, unknown>)[h] ?? '')),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${tab}.csv`);
  };

  const exportExcel = async () => {
    if (!currentData.length) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('data');
    sheet.addRow(Object.keys(currentData[0]));
    currentData.forEach((r) => sheet.addRow(Object.values(r)));
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${tab}.xlsx`);
  };

  const renderChart = useMemo(() => {
    if (tab === 'cost') {
      if (!cost.length) {
        return <p className="text-sm text-muted-foreground">No cost data available.</p>;
      }

      return (
        <SimpleBarChart
          data={cost.map((item, index) => ({
            label: item.asset,
            value: item.cost,
            color: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'][index % 4],
          }))}
          className="h-full"
        />
      );
    }

    const data = tab === 'pm'
      ? pm.map((item) => ({ label: item.period, value: item.compliance }))
      : downtime.map((item) => ({ label: item.period, value: item.downtime }));

    if (!data.length) {
      return <p className="text-sm text-muted-foreground">No trend data available.</p>;
    }

    return <SimpleLineChart data={data} className="h-full" showDots stroke="#6366f1" />;
  }, [tab, cost, pm, downtime]);

  return (
    <Card title="Analytics">
      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'pm' ? 'primary' : 'secondary'}
          onClick={() => handleTabChange('pm')}
        >
          PM Compliance
        </Button>
        <Button
          variant={tab === 'downtime' ? 'primary' : 'secondary'}
          onClick={() => handleTabChange('downtime')}
        >
          Downtime
        </Button>
        <Button
          variant={tab === 'cost' ? 'primary' : 'secondary'}
          onClick={() => handleTabChange('cost')}
        >
          Cost
        </Button>
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={exportCSV}>Export CSV</Button>
        <Button onClick={exportExcel}>Export Excel</Button>
      </div>
      <div className="w-full h-80 flex items-center justify-center">{renderChart}</div>
    </Card>
  );
}

