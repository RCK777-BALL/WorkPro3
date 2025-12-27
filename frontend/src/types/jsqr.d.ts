declare module 'jsqr' {
  export interface QRCodeLocation {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
  }

  export interface QRCode {
    data: string;
    binaryData: Uint8ClampedArray;
    chunks: Array<{ type: string; text?: string; bytes?: number[] }>;
    location: QRCodeLocation;
  }

  export interface JsQRConfig {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: JsQRConfig
  ): QRCode | null;
}
