import { describe, expect, it } from 'vitest';

import { samlResponseHandler } from '../../auth/saml';

describe('samlResponseHandler', () => {
  it('extracts email and roles from assertion payload', () => {
    process.env.ENABLE_SAML = 'true';
    const result = samlResponseHandler({
      body: {
        SAMLResponse: Buffer.from('<xml/>').toString('base64'),
        attributes: { email: 'test@example.com', roles: ['Admin'] },
        RelayState: '/dashboard',
      },
    } as any);

    expect(result.email).toBe('test@example.com');
    expect(result.roles).toContain('Admin');
    expect(result.relayState).toBe('/dashboard');
  });

  it('throws when email is missing', () => {
    process.env.ENABLE_SAML = 'true';
    expect(() => samlResponseHandler({ body: {} } as any)).toThrow('SAML assertion missing email');
  });
});
