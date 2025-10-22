import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

type KpiResponse = {
  completionRate: number;
  mttr: number;
  backlog: number;
};

type TrendPoint = {
  date: string;
  created: number;
  completed: number;
};

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    api
      .get('/analytics/kpis')
      .then((response) => setKpis(response.data))
      .catch(() => toast.error('Failed to load KPIs'));
    api
      .get('/analytics/trends')
      .then((response) => setTrend(response.data))
      .catch(() => toast.error('Failed to load trend data'));
  }, []);

  return (
    <div className="space-y-6 p-6 text-white">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Completion Rate</p>
          <p className="mt-2 text-3xl font-semibold">{kpis ? `${kpis.completionRate}%` : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">MTTR</p>
          <p className="mt-2 text-3xl font-semibold">{kpis ? `${kpis.mttr} hrs` : '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Backlog</p>
          <p className="mt-2 text-3xl font-semibold">{kpis ? kpis.backlog : '—'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm text-slate-400">Created vs Completed (Last 30 days)</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                labelStyle={{ color: '#cbd5f5' }}
              />
              <Line type="monotone" dataKey="created" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
