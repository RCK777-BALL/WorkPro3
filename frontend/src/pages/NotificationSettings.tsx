/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Phone, Send, Slack, Webhook, Bell } from 'lucide-react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import {
  listNotificationProviders,
  sendNotificationTest,
  type NotificationProviderStatus,
} from '@/api/notifications';
import { useSettingsStore } from '@/store/settingsStore';

interface TestFormState {
  emailTarget: string;
  smsTarget: string;
  webhookUrl: string;
  slackWebhookUrl: string;
  teamsWebhookUrl: string;
}

const NotificationSettingsPage = () => {
  const { notifications, setNotifications } = useSettingsStore();
  const [providers, setProviders] = useState<NotificationProviderStatus[]>([]);
  const [testState, setTestState] = useState<{ provider?: string; result?: string; error?: string }>({});
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Channels</p>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Notification Settings</h1>
          <p className="text-sm text-neutral-500">Configure outbound webhooks and messaging destinations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>
            {configuredProviders} of {providers.length || 4} providers configured
          </span>
        </div>
      </div>

      <Card title="Webhooks" subtitle="Deliver notifications to your own tooling" icon={<Webhook className="h-5 w-5 text-primary-500" />}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Generic webhook URL</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="https://hooks.example.com/notify"
              value={form.webhookUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, webhookUrl: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Slack webhook URL</label>
              <input
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                placeholder="https://hooks.slack.com/services/..."
                value={form.slackWebhookUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, slackWebhookUrl: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Teams webhook URL</label>
              <input
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
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
            <div key={provider.id} className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white/70 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{provider.label}</p>
                <p className="text-xs text-neutral-500">{provider.docsUrl}</p>
                <p className="text-xs text-neutral-500">{provider.supportsTarget ? 'Requires recipient' : 'Uses configured webhook'}</p>
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

      <Card title="Destination details" subtitle="Targets for email and SMS delivery" icon={<Send className="h-5 w-5 text-primary-500" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Email address for tests</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="alerts@example.com"
              value={form.emailTarget}
              onChange={(event) => setForm((prev) => ({ ...prev, emailTarget: event.target.value }))}
            />
            <p className="mt-1 text-xs text-neutral-500">Used for SMTP verification.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">SMS number for tests</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              placeholder="+15555555555"
              value={form.smsTarget}
              onChange={(event) => setForm((prev) => ({ ...prev, smsTarget: event.target.value }))}
            />
            <p className="mt-1 text-xs text-neutral-500">Stored as your default SMS destination.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotificationSettingsPage;
