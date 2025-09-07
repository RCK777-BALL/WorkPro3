import { fetchNotifications } from '../api/notifications';
import type { NotificationType } from '../types';
import { useSocketStore } from '../store/socketStore';

let pollInterval: ReturnType<typeof setInterval> | null = null;
let startTimeout: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let since: string | undefined;
let callback: ((notes: NotificationType[]) => void) | null = null;
let intervalMs = 30_000;

async function poll() {
  try {
    const params: Record<string, unknown> = {};
    if (since) params.since = since;
    const data = await fetchNotifications(params);
    if (Array.isArray(data) && data.length > 0) {
      since = data[data.length - 1].createdAt;
      callback?.(data);
    }
  } catch (err) {
    console.error('Notification poll failed', err);
  }
}

function beginPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(poll, intervalMs);
  // perform an immediate poll
  void poll();
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (startTimeout) {
    clearTimeout(startTimeout);
    startTimeout = null;
  }
}

export function startNotificationsPoll(
  onNotify: (notes: NotificationType[]) => void,
  interval = 30_000,
) {
  callback = onNotify;
  intervalMs = interval;

  const handleConnectionChange = (connected: boolean) => {
    if (connected) {
      stopPolling();
    } else if (!pollInterval && !startTimeout) {
      startTimeout = setTimeout(() => {
        beginPolling();
      }, 10_000);
    }
  };

  unsubscribe?.();
  unsubscribe = useSocketStore.subscribe(
    (s: { connected: boolean }) => s.connected,
    handleConnectionChange,
  );

  handleConnectionChange(useSocketStore.getState().connected);
}

export function stopNotificationsPoll() {
  stopPolling();
  unsubscribe?.();
  unsubscribe = null;
  callback = null;
  since = undefined;
}

