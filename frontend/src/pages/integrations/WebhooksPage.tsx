/*
 * SPDX-License-Identifier: MIT
 */

import WebhookSubscriptionsPanel from '@/integrations/WebhookSubscriptionsPanel';

export default function WebhooksPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-gray-500">
          Manage webhook subscriptions and secrets for signed event delivery.
        </p>
      </div>
      <WebhookSubscriptionsPanel apiBase="/api/webhooks/v2" />
    </div>
  );
}

