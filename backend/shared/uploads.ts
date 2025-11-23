// shared/uploads.ts

export interface UploadedFile {
  name: string;
  mimetype?: string;
  size?: number;
  data?: Buffer;
  mv?: (path: string) => Promise<void> | void;
}
