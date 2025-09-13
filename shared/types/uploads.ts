export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
}

export interface UploadResponse {
  uploads: UploadedFile[];
}
