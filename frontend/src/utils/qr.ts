/*
 * SPDX-License-Identifier: MIT
 */

import { BrowserQRCodeReader } from '@zxing/browser';
import QRCode from 'qrcode';

export const generateQRCode = async (data: string): Promise<string> => {
  return QRCode.toDataURL(data, { width: 300 });
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
