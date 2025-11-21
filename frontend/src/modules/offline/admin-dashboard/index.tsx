import ConflictDashboard from './ConflictDashboard';
import OfflineQueuePanel from './OfflineQueuePanel';
import DeviceTelemetryPanel from './DeviceTelemetryPanel';

export function OfflineAdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offline sync admin</h1>
        <p className="text-sm text-muted">Monitor conflicts, queues, and device health.</p>
      </div>
      <ConflictDashboard />
      <OfflineQueuePanel />
      <DeviceTelemetryPanel />
    </div>
  );
}

export default OfflineAdminDashboard;
