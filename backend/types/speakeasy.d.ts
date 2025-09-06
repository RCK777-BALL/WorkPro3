declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    length?: number;
    name?: string;
  }
  export interface GeneratedSecret {
    ascii?: string;
    hex?: string;
    base32: string;
    otpauth_url?: string;
  }
  export interface TotpVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
  }
  export function generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
  export const totp: {
    verify(opts: TotpVerifyOptions): boolean;
  };
}
