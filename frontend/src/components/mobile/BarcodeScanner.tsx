import React, { useEffect, useRef, useState } from 'react';
import { emitToast } from '@/context/ToastContext';

interface Props {
  onDetected: (value: string) => void;
  onError?: (error: string) => void;
  paused?: boolean;
}

const BARCODE_FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13'];

const BarcodeScanner: React.FC<Props> = ({ onDetected, onError, paused }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const start = async () => {
      if (paused) return;
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(nextStream);
        if (videoRef.current) {
          videoRef.current.srcObject = nextStream;
          await videoRef.current.play();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to start camera';
        onError?.(message);
        emitToast(message, 'error');
      }
    };
    void start();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [paused]);

  useEffect(() => {
    let raf = 0;
    const detect = async () => {
      if (paused) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        raf = requestAnimationFrame(detect);
        return;
      }
      try {
        if ('BarcodeDetector' in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (args: { formats: string[] }) => BarcodeDetector }).BarcodeDetector({
            formats: BARCODE_FORMATS,
          });
          const results = await detector.detect(video);
          if (results.length > 0) {
            onDetected(results[0].rawValue);
            return;
          }
        } else if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (imageData) {
            try {
              const jsqr = await import('https://cdn.skypack.dev/jsqr');
              const result = jsqr.default(imageData.data, imageData.width, imageData.height);
              if (result?.data) {
                onDetected(result.data);
                return;
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Barcode fallback failed';
              onError?.(message);
            }
          }
        }
      } finally {
        raf = requestAnimationFrame(detect);
      }
    };
    raf = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(raf);
  }, [paused, onDetected, onError]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
      <video ref={videoRef} className="block w-full" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-indigo-500/70" />
    </div>
  );
};

export default BarcodeScanner;
