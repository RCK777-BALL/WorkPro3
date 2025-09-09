import { BrowserQRCodeReader, BrowserQRCodeSvgWriter } from '@zxing/browser';

export const generateQRCode = async (data: string): Promise<string> => {
  const writer = new BrowserQRCodeSvgWriter();
  const svg = writer.write(data, 300, 300);
  const svgString = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
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
