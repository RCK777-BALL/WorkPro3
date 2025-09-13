/*
 * SPDX-License-Identifier: MIT
 */

import Card from '@common/Card';
import Avatar from '@common/Avatar';
import { useAuthStore, type AuthState } from '@/store/authStore';

export default function RightPanel() {
  const user = useAuthStore((s: AuthState) => s.user);

  return (
    <aside className="w-80 space-y-4">
      <Card title="User Info">
        <div className="flex items-center space-x-3">
          <Avatar name={user?.name ?? 'Guest User'} />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {user?.name ?? 'Guest User'}
            </p>
            {user?.role && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {user.role}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Map">
        <div className="flex h-48 w-full items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">
            Map placeholder
          </span>
        </div>
      </Card>
    </aside>
  );
}

