/*
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { ensureQrCode, generateQrCodeValue, parseQrCodeValue } from '../services/qrCode';

describe('qrCode service', () => {
  it('generates stable qr payloads with tenant', () => {
    const qr = generateQrCodeValue({ type: 'asset', id: '123', tenantId: 't1' });
    expect(qr).toBe('{"type":"asset","id":"123","tenantId":"t1"}');
  });

  it('ensures qr code is attached using object id', () => {
    const doc = { _id: new Types.ObjectId('64b64b2148b4d5b7c8b4d5b7'), tenantId: new Types.ObjectId('64b64b2148b4d5b7c8b4d5b8') };
    const withQr = ensureQrCode(doc, 'asset');
    expect(withQr.qrCode).toContain('"id":"64b64b2148b4d5b7c8b4d5b7"');
    expect(withQr.qrCode).toContain('"tenantId":"64b64b2148b4d5b7c8b4d5b8"');
  });

  it('parses valid qr codes and rejects invalid payloads', () => {
    const valid = parseQrCodeValue('{"type":"part","id":"abc"}');
    expect(valid).toEqual({ type: 'part', id: 'abc', tenantId: undefined });

    const invalidType = parseQrCodeValue('{"type":"unknown","id":"abc"}');
    expect(invalidType).toBeNull();

    const invalidJson = parseQrCodeValue('not-json');
    expect(invalidJson).toBeNull();
  });
});
