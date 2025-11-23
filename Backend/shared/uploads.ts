export interface UploadedFile {
  name: string;
  mimetype?: string;
  size?: number;
  data?: Buffer;
  mv?: (path: string) => Promise<void> | void;
  id?: string;
  filename?: string;
  url?: string;
}

export interface UploadResponse {
  uploads: Array<Pick<UploadedFile, 'id' | 'filename' | 'url'>>;
}

export type AttachmentInput =
  | {
      kind: 'base64';
      filename: string;
      data: string;
      contentType?: string;
    }
  | {
      kind: 'url';
      url: string;
      filename?: string;
      contentType?: string;
    };

export interface Attachment {
  url: string;
  filename: string;
  contentType?: string;
}
