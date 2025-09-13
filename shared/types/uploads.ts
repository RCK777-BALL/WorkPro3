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
