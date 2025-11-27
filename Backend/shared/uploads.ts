// shared/uploads.ts

export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  mimetype?: string;
  size?: number;
  data?: Buffer;
  mv?: (path: string) => Promise<void> | void;
}
