/*
 * SPDX-License-Identifier: MIT
 */

import ApiKeysPanel from '@/integrations/ApiKeysPanel';

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-gray-500">
          Create scoped keys for external integrations. Newly created tokens are shown once.
        </p>
      </div>
      <ApiKeysPanel apiBase="/api/integrations/v2" />
    </div>
  );
}

