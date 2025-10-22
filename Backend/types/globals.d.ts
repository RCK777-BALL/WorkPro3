// react-signature-canvas has no official types
declare module "react-signature-canvas" {
  import * as React from "react";
  export interface SignatureCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    penColor?: string; backgroundColor?: string; throttle?: number; velocityFilterWeight?: number;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>; clearOnResize?: boolean;
  }
  export default class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void; isEmpty(): boolean;
    fromDataURL(dataURL: string, opts?: { ratio?: number; width?: number; height?: number }): void;
    toDataURL(type?: string, encoderOptions?: number): string;
  }
}
interface SyncManager { register(tag: string): Promise<void>; getTags?(): Promise<string[]>; }
interface ServiceWorkerRegistration { sync?: SyncManager; }
