/*
 * SPDX-License-Identifier: MIT
 */

export const triggerFileDownload = (input: Blob | ArrayBuffer, fileName: string, mimeType?: string) => {
  const blob = input instanceof Blob ? input : new Blob([input], { type: mimeType ?? 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
