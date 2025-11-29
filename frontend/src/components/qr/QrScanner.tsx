/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import clsx from 'clsx';
import { ShieldOff, Video, Webcam } from 'lucide-react';

import Button from '@/components/common/Button';
import { scanQRCode } from '@/utils/qr';

type PermissionStateValue = PermissionState | 'unknown';

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource | HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

const resolveBarcodeDetector = (): BarcodeDetectorInstance | null => {
  const detectorCtor = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!detectorCtor) return null;
  try {
    return new detectorCtor({ formats: ['qr_code'] });
  } catch (err) {
    console.error('Failed to initialize BarcodeDetector', err);
    return null;
  }
};

export type QrScannerStatus =
  | 'idle'
  | 'requesting'
  | 'scanning'
  | 'denied'
  | 'unsupported'
  | 'error'
  | 'complete';

interface QrScannerProps {
  onDetected: (value: string) => void;
  onError?: (message: string) => void;
  onStatusChange?: (status: QrScannerStatus) => void;
  className?: string;
}

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    if ((error as { name?: string }).name === 'NotAllowedError') {
      return 'Camera permission was denied. Enable access to scan codes.';
    }
    return error.message;
  }
  return 'Unable to access camera. Please try again or enter the asset manually.';
};

const QrScanner: React.FC<QrScannerProps> = ({ onDetected, onError, onStatusChange, className }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const rafRef = React.useRef<number>();
  const detector = React.useMemo(resolveBarcodeDetector, []);

  const [status, setStatus] = React.useState<QrScannerStatus>('idle');
  const [message, setMessage] = React.useState<string>('Allow camera access to start scanning.');
  const [permissionState, setPermissionState] = React.useState<PermissionStateValue>('unknown');
  const [scanAttempt, setScanAttempt] = React.useState(0);

  const updateStatus = React.useCallback(
    (next: QrScannerStatus, detail?: string) => {
      setStatus(next);
      setMessage((prev) => detail ?? prev);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const stopStream = React.useCallback(() => {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) ?? null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) {
      video.srcObject = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  const requestPermissionState = React.useCallback(async () => {
    if (!navigator.permissions?.query) return;
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(result.state);
      result.onchange = () => setPermissionState(result.state);
    } catch (err) {
      console.warn('Unable to query camera permission', err);
    }
  }, []);

  const runBarcodeDetector = React.useCallback(
    async (video: HTMLVideoElement, barcodeDetector: BarcodeDetectorInstance) => {
      const detectFrame = async (): Promise<void> => {
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          rafRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const codes = await barcodeDetector.detect(video);
          const match = codes.find((code) => code.rawValue);
          if (match?.rawValue) {
            updateStatus('complete', 'QR code detected');
            stopStream();
            onDetected(match.rawValue);
            return;
          }
        } catch (err) {
          console.error('Barcode detection failed', err);
          stopStream();
          const detail = describeError(err);
          setMessage(detail);
          updateStatus('error', detail);
          onError?.(detail);
          return;
        }

        rafRef.current = requestAnimationFrame(detectFrame);
      };

      rafRef.current = requestAnimationFrame(detectFrame);
    },
    [onDetected, onError, stopStream, updateStatus],
  );

  const startScan = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera is not available in this browser.');
      updateStatus('unsupported', 'Camera is not available in this browser.');
      return;
    }

    updateStatus('requesting', 'Requesting camera access...');

    if (!detector) {
      updateStatus('scanning', 'Using fallback QR reader...');
      try {
        const rawValue = await scanQRCode(video);
        updateStatus('complete', 'QR code detected');
        onDetected(rawValue);
      } catch (err) {
        const detail = describeError(err);
        setMessage(detail);
        updateStatus('error', detail);
        onError?.(detail);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.playsInline = true;
      await video.play();
      setMessage('Point your camera at the QR code.');
      updateStatus('scanning', 'Point your camera at the QR code.');
      await runBarcodeDetector(video, detector);
    } catch (err) {
      const detail = describeError(err);
      if ((err as { name?: string }).name === 'NotAllowedError') {
        updateStatus('denied', detail);
      } else {
        updateStatus('error', detail);
      }
      onError?.(detail);
      setMessage(detail);
      stopStream();
    }
  }, [detector, onDetected, onError, runBarcodeDetector, stopStream, updateStatus]);

  React.useEffect(() => {
    requestPermissionState();
    startScan();

    return () => {
      stopStream();
    };
  }, [startScan, requestPermissionState, stopStream, scanAttempt]);

  const hintCopy = React.useMemo(() => {
    if (status === 'denied') {
      return 'Camera access was blocked. Enable it in your browser settings to scan QR codes.';
    }
    if (status === 'unsupported') {
      return 'This browser does not support camera scanning. Enter the asset id manually instead.';
    }
    if (status === 'error') {
      return 'We could not read a QR code. Try again or type the asset id.';
    }
    return 'Scanning uses your camera. Move closer if the code is small or low contrast.';
  }, [status]);

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900/80 shadow-sm dark:border-neutral-700">
        <video
          ref={videoRef}
          className="h-64 w-full bg-black object-cover"
          muted
          playsInline
        />
        {status !== 'scanning' && status !== 'complete' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-sm text-neutral-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              {status === 'denied' ? <ShieldOff /> : <Webcam />}
            </div>
            <p className="max-w-md px-4">{message}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span>{hintCopy}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setScanAttempt((value) => value + 1)}>
          Retry
        </Button>
      </div>
      {permissionState === 'denied' && (
        <p className="text-sm text-amber-600" role="alert">
          We cannot scan without camera access. Enable permission and retry.
        </p>
      )}
    </div>
  );
};

export default QrScanner;
