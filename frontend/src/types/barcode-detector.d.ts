declare global {
  interface BarcodeDetectorResult {
    rawValue: string;
    format: string;
    cornerPoints?: DOMPointReadOnly[];
    boundingBox?: DOMRectReadOnly;
  }

  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: { formats?: string[] }): BarcodeDetector;
    getSupportedFormats?(): Promise<string[]>;
  }

  var BarcodeDetector: BarcodeDetectorConstructor | undefined;
}

export {};
