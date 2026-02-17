/*
 * SPDX-License-Identifier: MIT
 */

import { Link } from 'react-router-dom';
import Card from '@/components/common/Card';
import { SectionHeader } from '@/components/ui';
import Button from '@/components/common/Button';

export default function MobileStrategy() {
  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Mobile Program"
        subtitle="Visible mobile distribution path for iOS, Android, and PWA operations."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Card.Header>
            <Card.Title>PWA Deployment</Card.Title>
            <Card.Description>Immediate rollout via browser install prompts.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2 text-sm">
            <p>Current status: production-ready for field usage and offline queue support.</p>
            <p>Route: /pwa/technician</p>
            <Link to="/pwa/technician">
              <Button variant="outline" size="sm">Open technician shell</Button>
            </Link>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>iOS App Lifecycle</Card.Title>
            <Card.Description>Native wrapper plan for App Store deployment.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2 text-sm">
            <p>Phase 1: Capacitor wrapper + secure token storage.</p>
            <p>Phase 2: push notifications + background sync tuning.</p>
            <p>Phase 3: TestFlight, then App Store release candidate.</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Android App Lifecycle</Card.Title>
            <Card.Description>Native wrapper plan for Play Store deployment.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2 text-sm">
            <p>Phase 1: TWA/Capacitor package from current web shell.</p>
            <p>Phase 2: foreground sync service and camera barcode reliability hardening.</p>
            <p>Phase 3: internal track, then production Play Store rollout.</p>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Distribution Checklist</Card.Title>
          <Card.Description>Operational gates before each mobile release.</Card.Description>
        </Card.Header>
        <Card.Content>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Offline sync smoke tests passed on real devices.</li>
            <li>Critical work-order flows validated with low network quality.</li>
            <li>Camera scan and attachment upload validated for both OS families.</li>
            <li>Security review completed for token storage and transport.</li>
            <li>Store metadata and privacy declarations updated for release.</li>
          </ul>
        </Card.Content>
      </Card>
    </div>
  );
}

