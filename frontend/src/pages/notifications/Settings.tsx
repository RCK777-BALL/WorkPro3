/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Phone, Send, Slack, Webhook, Bell, AlarmClock } from 'lucide-react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import {
  fetchNotificationSubscriptions,
  listNotificationProviders,
  sendNotificationTest,
  upsertNotificationSubscription,
  type NotificationProviderStatus,
  type NotificationSubscription,
} from '@/api/notifications';
import { updateNotificationPreferences } from '@/api/settings';
import { useSettingsStore } from '@/store/settingsStore';

interface TestFormState {
  emailTarget: string;
  smsTarget: string;
  webhookUrl: string;
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
}

const subscriptionEvents = [
  { key: 'assigned', label: 'Assignments', description: 'New work order assignments.' },
  { key: 'updated', label: 'Updates', description: 'General work order updates.' },
  { key: 'overdue', label: 'Overdue', description: 'SLA breaches and overdue items.' },
  { key: 'pm_due', label: 'PM due', description: 'Preventive maintenance reminders.' },
  { key: 'comment', label: 'Comments', description: 'Replies and mention alerts.' },
  { key: 'request_submitted', label: 'Requests', description: 'New request submissions.' },
];

const channelOptions: Array<{
  key: NotificationSubscription['channels'][number];
  label: string;
  description: string;
}> = [
  { key: 'in_app', label: 'In-app', description: 'Show alerts in the inbox.' },
  { key: 'email', label: 'Email', description: 'Send alerts to your email.' },
  { key: 'outlook', label: 'Outlook', description: 'Send alerts through Outlook SMTP.' },
  { key: 'teams', label: 'Teams', description: 'Send alerts to a Teams webhook.' },
  { key: 'push', label: 'Push', description: 'Browser or device push alerts.' },
  { key: 'webhook', label: 'Webhook', description: 'Send alerts to webhook endpoints.' },
];

const NotificationSettingsPage = () => {
  const { notifications, setNotifications } = useSettingsStore();
  const [providers, setProviders] = useState<NotificationProviderStatus[]>([]);
  const [testState, setTestState] = useState<{ provider?: string; result?: string; error?: string }>({});
  const [preferences, setPreferences] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: false });
  const [prefResult, setPrefResult] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<NotificationSubscription | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [form, setForm] = useState<TestFormState>({
    emailTarget: '',
    smsTarget: notifications.smsNumber ?? '',
    webhookUrl: notifications.webhookUrl ?? '',
    slackWebhookUrl: notifications.slackWebhookUrl ?? '',
    teamsWebhookUrl: notifications.teamsWebhookUrl ?? '',
  });

  useEffect(() => {
    listNotificationProviders()
      .then((data) => setProviders(data ?? []))
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    fetchNotificationSubscriptions()
      .then((data) => setSubscription(data[0] ?? null))
      .catch(() => setSubscription(null));
  }, []);

  useEffect(() => {
    setNotifications({
      smsNumber: form.smsTarget,
      webhookUrl: form.webhookUrl,
      slackWebhookUrl: form.slackWebhookUrl,
      teamsWebhookUrl: form.teamsWebhookUrl,
    });
  }, [form.smsTarget, form.webhookUrl, form.slackWebhookUrl, form.teamsWebhookUrl, setNotifications]);

  const configuredProviders = useMemo(() => providers.filter((p) => p.configured).length, [providers]);

  const sendTest = async (provider: NotificationProviderStatus['id']) => {
    setTestState({ provider });
    try {
      const payload = {
        provider,
        message: 'Test notification from WorkPro',
      } as any;
      if (provider === 'smtp') {
        payload.to = form.emailTarget;
        payload.subject = 'WorkPro notification test';
      } else if (provider === 'outlook') {
        payload.to = form.emailTarget;
        payload.subject = 'WorkPro Outlook notification test';
      } else if (provider === 'twilio') {
        payload.to = form.smsTarget;
      } else if (provider === 'slack') {
        payload.webhookUrl = form.slackWebhookUrl;
      } else if (provider === 'teams') {
        payload.webhookUrl = form.teamsWebhookUrl;
      }
      const result = await sendNotificationTest(payload);
      setTestState({ provider, result: `Delivered at ${result.deliveredAt}${result.target ? ` to ${result.target}` : ''}` });
    } catch (err) {
      setTestState({ provider, error: 'Failed to send test notification' });
      console.error(err);
    }
  };

  const savePreferences = async () => {
    try {
      await updateNotificationPreferences({ notifyByEmail: preferences.email, notifyBySms: preferences.sms });
      setPrefResult('Saved');
    } catch (err) {
      console.error(err);
      setPrefResult('Failed to save preferences');
    }
  };

  const toggleSubscriptionEvent = (key: string) => {
    setSubscription((prev) => {
      const current = prev?.events ?? [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return prev ? { ...prev, events: next } : { id: crypto.randomUUID(), events: next, channels: ['in_app'] };
    });
  };

  const toggleSubscriptionChannel = (key: NotificationSubscription['channels'][number]) => {
    setSubscription((prev) => {
      const current = prev?.channels ?? [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return prev ? { ...prev, channels: next } : { id: crypto.randomUUID(), events: [], channels: next };
    });
  };

  const updateSubscriptionField = (field: 'quietHours' | 'digest', value: any) => {
    setSubscription((prev) => {
      if (!prev) {
        return {
          id: crypto.randomUUID(),
          events: [],
          channels: ['in_app'],
          [field]: value,
        } as NotificationSubscription;
      }
      return { ...prev, [field]: value };
    });
  };

  const saveSubscription = async () => {
    if (!subscription) return;
    try {
      const payload = {
        events: subscription.events ?? [],
        channels: subscription.channels?.length
          ? subscription.channels
          : (['in_app'] as NotificationSubscription['channels']),
        quietHours: subscription.quietHours,
        digest: subscription.digest,
      };
      const saved = await upsertNotificationSubscription(payload);
      setSubscription(saved);
      setSubscriptionStatus('Saved');
    } catch (err) {
      console.error(err);
      setSubscriptionStatus('Failed to save subscription');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Channels</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Notification Settings</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Configure outbound webhooks and messaging destinations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>
            {configuredProviders} of {providers.length || 4} providers configured
          </span>
        </div>
      </div>

      <Card title="Subscriptions" subtitle="Choose when and where you receive alerts" icon={<AlarmClock className="h-5 w-5 text-primary-500" />}>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Channels</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {channelOptions.map((channel) => (
                <label key={channel.key} className="flex items-start gap-2 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]">
                  <input
                    type="checkbox"
                    checked={subscription?.channels?.includes(channel.key as any) ?? false}
                    onChange={() => toggleSubscriptionChannel(channel.key as any)}
                  />
                  <span>
                    <span className="font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{channel.label}</span>
                    <span className="block text-xs text-[var(--wp-color-text-muted)]">{channel.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Events</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {subscriptionEvents.map((event) => (
                <label key={event.key} className="flex items-start gap-2 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]">
                  <input
                    type="checkbox"
                    checked={subscription?.events?.includes(event.key) ?? false}
                    onChange={() => toggleSubscriptionEvent(event.key)}
                  />
                  <span>
                    <span className="font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{event.label}</span>
                    <span className="block text-xs text-[var(--wp-color-text-muted)]">{event.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Quiet hours</p>
              <div className="mt-2 grid gap-2">
                <label className="text-xs text-[var(--wp-color-text-muted)]">Start time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                  value={subscription?.quietHours?.start ?? ''}
                  onChange={(event) => updateSubscriptionField('quietHours', { ...subscription?.quietHours, start: event.target.value })}
                />
                <label className="text-xs text-[var(--wp-color-text-muted)]">End time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                  value={subscription?.quietHours?.end ?? ''}
                  onChange={(event) => updateSubscriptionField('quietHours', { ...subscription?.quietHours, end: event.target.value })}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Digest</p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
                  <input
                    type="checkbox"
                    checked={subscription?.digest?.enabled ?? false}
                    onChange={(event) => updateSubscriptionField('digest', { ...subscription?.digest, enabled: event.target.checked })}
                  />
                  Enable digest summaries
                </label>
                <select
                  className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                  value={subscription?.digest?.frequency ?? 'daily'}
                  onChange={(event) => updateSubscriptionField('digest', { ...subscription?.digest, frequency: event.target.value })}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={saveSubscription}>
              Save subscription
            </Button>
            {subscriptionStatus && <p className="text-xs text-[var(--wp-color-text-muted)]">{subscriptionStatus}</p>}
          </div>
        </div>
      </Card>

      <Card title="Webhooks" subtitle="Deliver notifications to your own tooling" icon={<Webhook className="h-5 w-5 text-primary-500" />}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Generic webhook URL</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              placeholder="https://hooks.example.com/notify"
              value={form.webhookUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, webhookUrl: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Slack webhook URL</label>
              <input
                className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                placeholder="https://hooks.slack.com/services/..."
                value={form.slackWebhookUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, slackWebhookUrl: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Teams webhook URL</label>
              <input
                className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
                placeholder="https://contoso.webhook.office.com/..."
                value={form.teamsWebhookUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, teamsWebhookUrl: event.target.value }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Slack className="h-4 w-4" />}
              onClick={() => sendTest('slack')}
              disabled={!form.slackWebhookUrl || testState.provider === 'slack'}
            >
              Send Slack test
            </Button>
            <Button
              variant="outline"
              icon={<Link2 className="h-4 w-4" />}
              onClick={() => sendTest('teams')}
              disabled={!form.teamsWebhookUrl || testState.provider === 'teams'}
            >
              Send Teams test
            </Button>
            <Button
              variant="ghost"
              onClick={() => sendTest('smtp')}
              disabled={testState.provider === 'smtp'}
              icon={<Send className="h-4 w-4" />}
            >
              Email test
            </Button>
            <Button
              variant="ghost"
              onClick={() => sendTest('outlook')}
              disabled={testState.provider === 'outlook'}
              icon={<Send className="h-4 w-4" />}
            >
              Outlook test
            </Button>
            <Button
              variant="ghost"
              onClick={() => sendTest('twilio')}
              disabled={testState.provider === 'twilio'}
              icon={<Phone className="h-4 w-4" />}
            >
              SMS test
            </Button>
          </div>
          {testState.result && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{testState.result}</p>
          )}
          {testState.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{testState.error}</p>
          )}
        </div>
      </Card>

      <Card title="Provider status" subtitle="Verify which channels are active" icon={<Bell className="h-5 w-5 text-amber-500" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {providers.map((provider) => (
            <div key={provider.id} className="flex items-start justify-between rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/70 p-3 dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]">
              <div>
                <p className="text-sm font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{provider.label}</p>
                <p className="text-xs text-[var(--wp-color-text-muted)]">{provider.docsUrl}</p>
                <p className="text-xs text-[var(--wp-color-text-muted)]">{provider.supportsTarget ? 'Requires recipient' : 'Uses configured webhook'}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${provider.configured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
              >
                {provider.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="User opt-in" subtitle="Control how you receive alerts" icon={<Bell className="h-5 w-5 text-primary-500" />}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(event) => setPreferences((prev) => ({ ...prev, email: event.target.checked }))}
            />
            Email notifications
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">
            <input
              type="checkbox"
              checked={preferences.sms}
              onChange={(event) => setPreferences((prev) => ({ ...prev, sms: event.target.checked }))}
            />
            SMS notifications
          </label>
          <Button variant="primary" onClick={savePreferences} icon={<Bell className="h-4 w-4" />}>
            Save preferences
          </Button>
          {prefResult && <p className="text-xs text-[var(--wp-color-text-muted)]">{prefResult}</p>}
        </div>
      </Card>

      <Card title="Destination details" subtitle="Targets for email and SMS delivery" icon={<Send className="h-5 w-5 text-primary-500" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Email address for tests</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              placeholder="alerts@example.com"
              value={form.emailTarget}
              onChange={(event) => setForm((prev) => ({ ...prev, emailTarget: event.target.value }))}
            />
            <p className="mt-1 text-xs text-[var(--wp-color-text-muted)]">Used for SMTP verification.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">SMS number for tests</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              placeholder="+15555555555"
              value={form.smsTarget}
              onChange={(event) => setForm((prev) => ({ ...prev, smsTarget: event.target.value }))}
            />
            <p className="mt-1 text-xs text-[var(--wp-color-text-muted)]">Stored as your default SMS destination.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;

