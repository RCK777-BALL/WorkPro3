import { fetchNotifications } from '@/api/notifications';
import type { NotificationType } from '@/types';
import { useSocketStore } from '@/store/socketStore';
import { emitToast } from '@/context/ToastContext';

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let startTimeout: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let since: string | undefined;
let callback: ((notes: NotificationType[]) => void) | null = null;
let intervalMs = 30_000;
let retryCount = 0;
const MAX_RETRIES = 5;

function scheduleNextPoll(delay: number) {
  pollTimer = setTimeout(() => void poll(), delay);
}

async function poll() {
  pollTimer = null;
  try {
    const params: Record<string, unknown> = {};
    if (since) params.since = since;
    const data = await fetchNotifications(params);
    if (Array.isArray(data) && data.length > 0) {
      since = data[data.length - 1].createdAt;
      callback?.(data);
    }
    retryCount = 0;
    scheduleNextPoll(intervalMs);
  } catch (err) {
    console.error('Notification poll failed', err);
    retryCount += 1;
    if (retryCount >= MAX_RETRIES) {
      emitToast('Live notifications are unavailable; please refresh later', 'error');
      stopPolling();
    } else {
      const delay = intervalMs * 2 ** (retryCount - 1);
      scheduleNextPoll(delay);
    }
  }
}

function beginPolling() {
  if (pollTimer) return;
  retryCount = 0;
  void poll();
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (startTimeout) {
    clearTimeout(startTimeout);
    startTimeout = null;
  }
  retryCount = 0;
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
    } else if (!pollTimer && !startTimeout) {
      startTimeout = setTimeout(() => {
        beginPolling();
      }, 10_000);
    }
  };

  unsubscribe?.();
  unsubscribe = useSocketStore.subscribe((state) => {
    handleConnectionChange(state.connected);
  });

  handleConnectionChange(useSocketStore.getState().connected);
}

export function stopNotificationsPoll() {
  stopPolling();
  unsubscribe?.();
  unsubscribe = null;
  callback = null;
  since = undefined;
}

