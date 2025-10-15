import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ClipboardList, Wrench, AlertTriangle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface Metric {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const formatNumber = (n: number) => n.toLocaleString();
const formatDate = (d: string) => new Date(d).toLocaleDateString();
const formatPercent = (n: number) => `${n.toFixed(1)}%`;

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryRes, woRes] = await Promise.all([
          api.get("/summary"),
          api.get("/workorders?limit=5"),
        ]);

        const data = summaryRes.data;
        setMetrics([
          { label: "Total Work Orders", value: data.totalWO || 120, color: "bg-blue-600", icon: <ClipboardList className="w-5 h-5" /> },
          { label: "Active PMs", value: data.activePM || 32, color: "bg-green-600", icon: <Wrench className="w-5 h-5" /> },
          { label: "Overdue", value: data.overdue || 8, color: "bg-red-600", icon: <AlertTriangle className="w-5 h-5" /> },
          { label: "Avg. Response Time", value: data.avgResponse || 2.5, color: "bg-yellow-500", icon: <Clock className="w-5 h-5" /> },
        ]);

        setChartData([
          { name: "Mon", value: 14 },
          { name: "Tue", value: 18 },
          { name: "Wed", value: 9 },
          { name: "Thu", value: 12 },
          { name: "Fri", value: 21 },
          { name: "Sat", value: 6 },
          { name: "Sun", value: 11 },
        ]);

        setWorkOrders(woRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen p-6 text-gray-100 bg-slate-950">
      <h1 className="mb-8 text-3xl font-semibold">Dashboard Overview</h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <ModuleCard key={i} label={m.label} value={m.value} color={m.color} icon={m.icon} />
        ))}
      </div>

      {/* CHART */}
      <div className="p-6 mb-8 border bg-slate-900 rounded-xl border-slate-800">
        <h2 className="mb-4 text-xl font-semibold">Work Orders Created per Day</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RECENT WORK ORDERS */}
      <div className="p-6 border bg-slate-900 rounded-xl border-slate-800">
        <h2 className="mb-4 text-xl font-semibold">Recent Work Orders</h2>
        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : workOrders.length > 0 ? (
          <WorkOrderPreviewList workOrders={workOrders} />
        ) : (
          <p className="text-slate-400">No recent work orders found.</p>
        )}
      </div>
    </div>
  );
}

/* KPI Card Component */
function ModuleCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-4 bg-slate-900 border border-slate-800 flex items-center gap-3`}>
      <div className={`p-3 rounded-lg ${color} bg-opacity-20 text-white`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-xl font-semibold">{formatNumber(value)}</p>
      </div>
    </div>
  );
}

/* Work Orders List */
function WorkOrderPreviewList({ workOrders }: { workOrders: WorkOrder[] }) {
  return (
    <ul className="divide-y divide-slate-800">
      {workOrders.map((wo) => (
        <li key={wo.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{wo.title}</p>
            <p className="text-sm text-slate-400">
              {formatDate(wo.createdAt)} • <span className="capitalize">{wo.priority}</span>
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded ${
              wo.status === "Open" ? "bg-green-600/20 text-green-400" : "bg-slate-700/40 text-slate-300"
            }`}
          >
            {wo.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
