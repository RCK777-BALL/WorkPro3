// shared/uploads.ts

export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  mimetype?: string | undefined;
  size?: number | undefined;
  data?: Buffer | undefined;
  mv?: ((path: string) => Promise<void> | void) | undefined;
}
import type { Buffer } from 'buffer';
