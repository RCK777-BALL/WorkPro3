import { describe, expect, it } from 'vitest';

import { buildSessionBinding, isSessionBindingValid } from '../../utils/sessionBinding';

const buildRequest = (ip: string, userAgent: string, deviceId?: string) => ({
  ip,
  headers: {
    'user-agent': userAgent,
    ...(deviceId ? { 'x-device-id': deviceId } : {}),
  },
  get: (header: string) => {
    if (header.toLowerCase() === 'user-agent') return userAgent;
    return undefined;
  },
}) as any;

describe('session policy binding', () => {
  it('rejects mismatched ip hash', () => {
    const binding = buildSessionBinding(buildRequest('1.1.1.1', 'agent'));
    expect(isSessionBindingValid(binding, buildRequest('2.2.2.2', 'agent'))).toBe(false);
  });

  it('accepts matching device and agent', () => {
    const req = buildRequest('10.0.0.1', 'agent/1.0', 'device-1');
    const binding = buildSessionBinding(req);
    expect(isSessionBindingValid(binding, buildRequest('10.0.0.1', 'agent/1.0', 'device-1'))).toBe(true);
  });
});
