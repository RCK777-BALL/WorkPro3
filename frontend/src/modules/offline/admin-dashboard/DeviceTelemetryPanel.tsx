import { useEffect, useState } from 'react';

type Telemetry = {
  deviceId: string;
  platform?: string;
  appVersion?: string;
  pendingActions?: number;
  failedActions?: number;
  totalConflicts?: number;
  lastFailureReason?: string;
};

export function DeviceTelemetryPanel() {
  const [devices, setDevices] = useState<Telemetry[]>([]);

  useEffect(() => {
    void fetch('/api/mobile/admin/sync/telemetry')
      .then((res) => res.json())
      .then((json) => setDevices(json.data ?? []))
      .catch(() => setDevices([]));
  }, []);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Device telemetry</h2>
      <p className="text-sm text-muted">Offline device status, failures, and conflicts.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {devices.map((device) => (
          <div key={device.deviceId} className="rounded border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{device.deviceId}</span>
              <span className="text-xs text-slate-500">{device.platform ?? 'unknown'}</span>
            </div>
            <div className="text-xs text-slate-600">App: {device.appVersion ?? 'n/a'}</div>
            <div className="text-xs text-slate-600">Pending: {device.pendingActions ?? 0}</div>
            <div className="text-xs text-slate-600">Failed: {device.failedActions ?? 0}</div>
            <div className="text-xs text-slate-600">Conflicts: {device.totalConflicts ?? 0}</div>
            {device.lastFailureReason && (
              <div className="text-xs text-amber-700">Last failure: {device.lastFailureReason}</div>
            )}
          </div>
        ))}
        {devices.length === 0 && <div className="text-sm text-slate-500">No telemetry captured yet.</div>}
      </div>
    </section>
  );
}

export default DeviceTelemetryPanel;
