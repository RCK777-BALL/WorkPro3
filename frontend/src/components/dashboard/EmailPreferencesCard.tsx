/*
 * SPDX-License-Identifier: MIT
 */

import type { ChangeEvent } from 'react';
import { Mail } from 'lucide-react';
import Card from '@/components/common/Card';
import { useSettingsStore, type EmailSettings } from '@/store/settingsStore';

const emailPreferenceOptions: Array<{
  key: keyof EmailSettings;
  label: string;
  description: string;
}> = [
  {
    key: 'dailyDigest',
    label: 'Daily digest',
    description: 'Stay in the loop with a morning overview of activity.',
  },
  {
    key: 'weeklyReport',
    label: 'Weekly reports',
    description: 'Get a summary of trends and performance each week.',
  },
  {
    key: 'criticalAlerts',
    label: 'Critical alerts',
    description: 'Receive immediate notifications for urgent issues.',
  },
];

const EmailPreferencesCard = () => {
  const emailPreferences = useSettingsStore((state) => state.email);
  const setEmailPreferences = useSettingsStore((state) => state.setEmail);

  return (
    <Card
      title="Email Preferences"
      subtitle="Control which automated emails you receive."
      icon={<Mail className="h-5 w-5 text-neutral-500" />}
      className="bg-white dark:bg-neutral-900"
    >
      <div className="space-y-4">
        {emailPreferenceOptions.map(({ key, label, description }) => (
          <div className="flex items-center justify-between" key={key}>
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={emailPreferences[key]}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEmailPreferences({ [key]: event.target.checked } as Partial<EmailSettings>)
                }
              />
              <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default EmailPreferencesCard;
