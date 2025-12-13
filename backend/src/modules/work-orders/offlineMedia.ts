export interface DeferredMediaUpload {
  workOrderId: string;
  items: { name: string; type: string; dataUrl: string; capturedAt: number }[];
}

const pendingUploads: DeferredMediaUpload[] = [];

export const queueMediaUpload = (upload: DeferredMediaUpload) => {
  pendingUploads.push(upload);
};

export const getPendingUploads = () => [...pendingUploads];

export async function flushPendingUploads(
  uploader: (upload: DeferredMediaUpload) => Promise<void>
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  while (pendingUploads.length > 0) {
    const upload = pendingUploads.shift();
    if (!upload) break;
    try {
      await uploader(upload);
      processed += 1;
    } catch (err) {
      failed += 1;
      pendingUploads.push(upload);
      if (pendingUploads.length > 20) {
        pendingUploads.splice(0, pendingUploads.length - 20);
      }
      console.error('Deferred media upload failed', err);
      break;
    }
  }
  return { processed, failed };
}
