/*
 * SPDX-License-Identifier: MIT
 */

import { expect, test } from '@playwright/test';
import { buildQrLabelMarkup } from '../src/components/qr/qrPrint';

test('printable QR label markup renders in browser context', async ({ page }) => {
  const html = await buildQrLabelMarkup({
    name: 'Pump Station',
    subtitle: 'Line A',
    description: 'Maintenance tag',
    qrValue: '{"type":"asset","id":"123"}',
  });

  await page.setContent(html);

  await expect(page.getByText('Pump Station')).toBeVisible();
  await expect(page.getByText('Line A')).toBeVisible();
  const img = page.locator('img[alt="QR code"]');
  await expect(img).toHaveAttribute('src', /data:image\/png/);
});
