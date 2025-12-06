/*
 * SPDX-License-Identifier: MIT
 */

import QRCode from 'qrcode';

export interface QrPrintOptions {
  name: string;
  qrValue: string;
  subtitle?: string;
  description?: string;
  format?: QrLabelFormat;
}

export type QrLabelFormat = 'standard' | 'compact' | 'shipping';

const escapeHtml = (value?: string) =>
  (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildQrLabelMarkup = async ({ name, qrValue, subtitle, description, format = 'standard' }: QrPrintOptions) => {
  const dataUrl = await QRCode.toDataURL(qrValue, { width: 220, margin: 1 });
  const safeName = escapeHtml(name);
  const safeSubtitle = escapeHtml(subtitle);
  const safeDescription = escapeHtml(description);

  if (format === 'compact') {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR Label - ${safeName}</title>
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 16px; background: #f8fafc; }
      .label { width: 520px; border: 1px dashed #cbd5e1; border-radius: 14px; padding: 12px 16px; background: white; }
      .row { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; }
      .qr { display: flex; justify-content: center; }
      .meta { text-align: left; }
      .name { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
      .subtitle { font-size: 13px; color: #475569; margin: 0; }
      .description { font-size: 12px; color: #64748b; margin-top: 6px; }
      .footer { margin-top: 10px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="row">
        <div class="qr"><img alt="QR code" width="110" height="110" src="${dataUrl}" /></div>
        <div class="meta">
          <div class="name">${safeName}</div>
          ${safeSubtitle ? `<p class="subtitle">${safeSubtitle}</p>` : ''}
          ${safeDescription ? `<p class="description">${safeDescription}</p>` : ''}
        </div>
      </div>
      <div class="footer">
        <span>Compact bin label</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  </body>
</html>`;
  }

  if (format === 'shipping') {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR Label - ${safeName}</title>
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; background: #f8fafc; }
      .label { width: 640px; border: 2px solid #0f172a; border-radius: 18px; padding: 18px 20px; background: white; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .badge { background: #0f172a; color: white; padding: 4px 10px; border-radius: 999px; font-size: 12px; letter-spacing: 0.04em; }
      .grid { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: center; }
      .qr { display: flex; justify-content: center; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
      .name { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
      .subtitle { font-size: 14px; color: #475569; margin: 0; }
      .description { font-size: 13px; color: #475569; margin-top: 8px; }
      .meta { margin-top: 12px; display: flex; gap: 18px; font-size: 12px; color: #475569; }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="header">
        <span class="badge">QR / SHIPPING</span>
        <span style="font-size: 12px; color: #475569;">Printed ${new Date().toLocaleString()}</span>
      </div>
      <div class="grid">
        <div class="qr"><img alt="QR code" width="180" height="180" src="${dataUrl}" /></div>
        <div>
          <div class="name">${safeName}</div>
          ${safeSubtitle ? `<p class="subtitle">Vendor: ${safeSubtitle}</p>` : ''}
          ${safeDescription ? `<p class="description">${safeDescription}</p>` : ''}
          <div class="meta">
            <span>Label: Shipping / Drawer</span>
            <span>Scan to view part</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR Label - ${safeName}</title>
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; background: #f8fafc; }
      .label { width: 320px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      .qr { display: flex; justify-content: center; margin-bottom: 12px; }
      .meta { text-align: center; }
      .name { font-size: 20px; font-weight: 700; color: #0f172a; margin: 4px 0; }
      .subtitle { font-size: 14px; color: #475569; margin: 0; }
      .description { font-size: 13px; color: #64748b; margin-top: 6px; }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="qr"><img alt="QR code" src="${dataUrl}" /></div>
      <div class="meta">
        <div class="name">${safeName}</div>
        ${safeSubtitle ? `<p class="subtitle">${safeSubtitle}</p>` : ''}
        ${safeDescription ? `<p class="description">${safeDescription}</p>` : ''}
      </div>
    </div>
  </body>
</html>`;
};

