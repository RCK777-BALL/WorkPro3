export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
}

export interface UploadResponse {
  uploads: UploadedFile[];
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
