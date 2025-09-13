/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

type PmRecord = { period: string; compliance: number };
type DowntimeRecord = { period: string; downtime: number };
type CostRecord = { asset: string; cost: number };

export default function Analytics() {
  const [pm, setPm] = useState<PmRecord[]>([]);
  const [downtime, setDowntime] = useState<DowntimeRecord[]>([]);
  const [cost, setCost] = useState<CostRecord[]>([]);
  const [tab, setTab] = useState<'pm' | 'downtime' | 'cost'>('pm');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pmRes, downRes, costRes] = await Promise.all([
          http.get<PmRecord[]>('/reports/pm-compliance'),
          http.get<DowntimeRecord[]>('/reports/downtime'),
          http.get<CostRecord[]>('/reports/cost-by-asset'),
        ]);
        setPm(pmRes.data);
        setDowntime(downRes.data);
        setCost(costRes.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      }
    };
    fetchData();
  }, []);

  const currentData = tab === 'pm' ? pm : tab === 'downtime' ? downtime : cost;

  const exportCSV = () => {
    if (!currentData.length) return;
    const headers = Object.keys(currentData[0]);
    const rows = currentData.map((r) => headers.map((h) => (r as any)[h]));
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

  const renderChart = () => {
    if (tab === 'cost') {
      return (
        <BarChart data={cost}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="asset" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="cost" fill="#8884d8" />
        </BarChart>
      );
    }
    const data = tab === 'pm' ? pm : downtime;
    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey={tab === 'pm' ? 'compliance' : 'downtime'}
          stroke="#8884d8"
        />
      </LineChart>
    );
  };

  return (
    <Card title="Analytics">
      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'pm' ? 'primary' : 'secondary'}
          onClick={() => setTab('pm')}
        >
          PM Compliance
        </Button>
        <Button
          variant={tab === 'downtime' ? 'primary' : 'secondary'}
          onClick={() => setTab('downtime')}

        >
          Downtime
        </Button>
        <Button
          variant={tab === 'cost' ? 'primary' : 'secondary'}
          onClick={() => setTab('cost')}
        >
          Cost
        </Button>
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={exportCSV}>Export CSV</Button>
        <Button onClick={exportExcel}>Export Excel</Button>
      </div>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
