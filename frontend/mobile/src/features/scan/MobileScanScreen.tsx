/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/browser';
import ResponsiveMobileShell from '../../layouts/ResponsiveMobileShell';

export type NormalizedScanPayload = {
  type: 'qr' | 'code128' | 'manual';
  code: string;
  rawData?: string;
  timestamp: string;
};

type ScannerControls = { start: () => Promise<void>; stop: () => void };

interface Props {
  onNavigate: (payload: NormalizedScanPayload) => void;
  title?: string;
  onScannerReady?: (controls: ScannerControls) => void;
}

const supportedFormats = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128];

const formatToType = (format: BarcodeFormat): NormalizedScanPayload['type'] =>
  format === BarcodeFormat.CODE_128 ? 'code128' : 'qr';

const MobileScanScreen: React.FC<Props> = ({ onNavigate, title = 'Scan code', onScannerReady }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('Camera stopped');
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [lastPayload, setLastPayload] = useState<NormalizedScanPayload | null>(null);

  const hints = useMemo(() => {
    const map = new Map();
    map.set(DecodeHintType.POSSIBLE_FORMATS, supportedFormats);
    return map;
  }, []);

  const emitPayload = useCallback(
    (payload: NormalizedScanPayload) => {
      setLastPayload(payload);
      onNavigate(payload);
    },
    [onNavigate],
  );

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current?.reset();
    setIsActive(false);
    setStatus('Camera stopped');
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in this environment. Use manual entry instead.');
      setPermissionDenied(true);
      return;
    }

    setError(null);
    setPermissionDenied(false);
    setStatus('Requesting camera…');

    try {
      const reader = readerRef.current ?? new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, decodeError) => {
        if (decodeError) {
          if ((decodeError as Error).name === 'NotAllowedError') {
            setPermissionDenied(true);
            setError('Camera permission denied. Use manual entry or enable camera access in your browser.');
            stopScanner();
          }
          return;
        }

        if (!result) return;
        const format = result.getBarcodeFormat();
        if (!supportedFormats.includes(format)) {
          setError('Scanned format is not supported. Please use QR or Code 128 labels.');
          return;
        }

        const payload: NormalizedScanPayload = {
          type: formatToType(format),
          code: result.getText(),
          rawData: result.getRawBytes()?.join(', '),
          timestamp: new Date().toISOString(),
        };
        emitPayload(payload);
        setStatus('Code captured');
      });

      controlsRef.current = controls;
      setIsActive(true);
      setStatus('Camera active. Hold the QR or Code128 label inside the frame.');
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : 'Unable to start camera';
      if ((startError as Error).name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Camera permission denied. Use manual entry or enable camera access in your browser.');
      } else {
        setError(message);
      }
      stopScanner();
    }
  }, [emitPayload, hints, stopScanner]);

  useEffect(() => {
    onScannerReady?.({ start: startScanner, stop: stopScanner });
  }, [onScannerReady, startScanner, stopScanner]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, [startScanner, stopScanner]);

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      setError('Enter a code before submitting.');
      return;
    }
    const payload: NormalizedScanPayload = {
      type: 'manual',
      code: manualCode.trim(),
      rawData: manualCode.trim(),
      timestamp: new Date().toISOString(),
    };
    emitPayload(payload);
    setManualCode('');
    setStatus('Manual code captured');
  };

  return (
    <ResponsiveMobileShell
      title={title}
      nav={[{ id: 'scanner', label: 'Scanner', onSelect: () => {} }]}
      rightRail={
        lastPayload && (
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-800">
            <p className="text-xs font-semibold text-neutral-500">Last payload</p>
            <p className="text-neutral-900">Type: {lastPayload.type}</p>
            <p className="break-words text-neutral-900">Code: {lastPayload.code}</p>
            <p className="break-words text-neutral-700">Raw: {lastPayload.rawData ?? 'n/a'}</p>
            <p className="text-neutral-500">{new Date(lastPayload.timestamp).toLocaleString()}</p>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <p>
            Aim your camera at QR or Code 128 labels. Keep the label within the guide and ensure there is enough light for the
            scanner.
          </p>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold">Camera</span>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-neutral-900">Live scanner</p>
            <div className="flex gap-2">
              <button
                className="rounded border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-800"
                onClick={stopScanner}
                disabled={!isActive}
              >
                Stop
              </button>
              <button
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={startScanner}
              >
                Start
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-black/80">
            <video ref={videoRef} className="h-56 w-full object-cover" autoPlay muted playsInline />
          </div>
          <p className="text-xs text-neutral-600">{status}</p>
          {permissionDenied && (
            <p className="text-xs text-amber-700">
              Camera access is blocked. Enable camera permissions or use manual code entry below.
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <p className="text-sm font-semibold text-neutral-900">Manual entry</p>
          <p className="text-xs text-neutral-600">
            If your device cannot access the camera, enter the code printed on the label. This falls back to the same payload
            format the navigation layer expects.
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              className="w-full rounded border border-neutral-200 p-2 text-sm"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Enter QR or Code128 value"
            />
            <button
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white md:w-32"
              onClick={handleManualSubmit}
            >
              Submit code
            </button>
          </div>
        </div>
      </div>
    </ResponsiveMobileShell>
  );
};

export default MobileScanScreen;

