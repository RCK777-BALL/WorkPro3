/*
 * SPDX-License-Identifier: MIT
 */

import QRCode from 'qrcode';

export interface QrPrintOptions {
  name: string;
  qrValue: string;
  subtitle?: string;
  description?: string;
}

const escapeHtml = (value?: string) =>
  (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const buildQrLabelMarkup = async ({ name, qrValue, subtitle, description }: QrPrintOptions) => {
  const dataUrl = await QRCode.toDataURL(qrValue, { width: 220, margin: 1 });
  const safeName = escapeHtml(name);
  const safeSubtitle = escapeHtml(subtitle);
  const safeDescription = escapeHtml(description);

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

