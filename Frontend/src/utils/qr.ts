import { BrowserQRCodeReader } from '@zxing/browser';

export const generateQRCode = async (data: string): Promise<string> => {
  // This would typically integrate with a QR code generation library
  // For now, we'll return a placeholder
  return `data:image/png;base64,${btoa('QR Code for: ' + data)}`;
};

export const scanQRCode = async (
  videoElem: HTMLVideoElement
): Promise<string> => {
  const reader = new BrowserQRCodeReader();
  try {
    const result = await reader.decodeOnceFromVideoDevice(undefined, videoElem);
    return result.getText();
  } finally {
    (reader as any).reset?.();
  }
};
