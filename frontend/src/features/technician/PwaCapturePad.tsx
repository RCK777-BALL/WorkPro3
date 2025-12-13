/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PenTool, RotateCcw, Sparkles } from 'lucide-react';

import Button from '@/components/common/Button';

type MinimalSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type MinimalSpeechRecognitionEvent = {
  results: Array<{ 0: { transcript: string } }>;
};

type MinimalSpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

interface PwaCapturePadProps {
  onSave: (payload: { image: string | null; note: string }) => void;
}

const PwaCapturePad: React.FC<PwaCapturePadProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [scribbling, setScribbling] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    const SpeechAPI =
      (window as unknown as { webkitSpeechRecognition?: MinimalSpeechRecognitionConstructor }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: MinimalSpeechRecognitionConstructor }).SpeechRecognition;
    if (SpeechAPI) {
      recognitionRef.current = new SpeechAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: MinimalSpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join(' ');
        setNote((prev) => `${prev ? `${prev} ` : ''}${transcript}`.trim());
      };
      recognitionRef.current.onerror = (event) => {
        setVoiceError(event.error ?? 'Unable to capture voice notes');
        setListening(false);
      };
      recognitionRef.current.onend = () => setListening(false);
      setVoiceSupported(true);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      ctxRef.current = canvas.getContext('2d');
    }
  }, []);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPhoto(dataUrl);
    requestAnimationFrame(() => renderToCanvas(dataUrl));
    event.target.value = '';
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const renderToCanvas = (src: string) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
    };
    image.src = src;
  };

  const startScribble = (event: React.PointerEvent<HTMLCanvasElement>) => {
    setScribbling(true);
    draw(event, true);
  };

  const stopScribble = () => setScribbling(false);

  const draw = (event: React.PointerEvent<HTMLCanvasElement>, begin = false) => {
    if (!scribbling && !begin) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.lineTo(event.clientX - rect.left + 0.1, event.clientY - rect.top + 0.1);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (photo) renderToCanvas(photo);
    }
    setNote('');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas ? canvas.toDataURL('image/png') : photo;
    onSave({ image: dataUrl ?? null, note: note.trim() });
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    setVoiceError(null);
    setListening(true);
    recognitionRef.current.start();
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-500">Capture</p>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Photo markup & voice notes</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <PenTool className="h-4 w-4" /> Scribble over photos & sync later
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr,320px]">
        <div className="flex flex-col gap-3">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-sm font-medium text-primary-700 transition hover:border-primary-400 dark:border-neutral-700 dark:text-primary-200">
            <Sparkles className="h-4 w-4" />
            <span>{photo ? 'Replace photo' : 'Capture / upload'}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
          <div className="relative min-h-[240px] rounded-lg border border-neutral-200 bg-neutral-50/60 p-2 shadow-inner dark:border-neutral-800 dark:bg-neutral-900/60">
            <canvas
              ref={canvasRef}
              onPointerDown={startScribble}
              onPointerMove={(event) => draw(event)}
              onPointerUp={stopScribble}
              onPointerLeave={stopScribble}
              className="h-[320px] w-full rounded-md bg-white dark:bg-neutral-900"
            />
            {!photo && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                Tap to add a photo and mark it up
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Notes</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-[120px] rounded-md border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
            placeholder="Add context for the attachment"
          />
          <div className="flex flex-wrap items-center gap-2">
            {voiceSupported ? (
              <Button
                type="button"
                size="sm"
                variant={listening ? 'primary' : 'outline'}
                className="flex items-center gap-2"
                onClick={toggleDictation}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? 'Stop dictation' : 'Dictate note'}
              </Button>
            ) : (
              <span className="text-xs text-neutral-500">Voice-to-text is not available in this browser.</span>
            )}
            <Button type="button" size="sm" variant="ghost" className="flex items-center gap-2" onClick={clear}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
          {voiceError && <p className="text-xs text-rose-500">{voiceError}</p>}
          <div className="flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSave} disabled={!photo && !note.trim()}>
              Save note to sync queue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaCapturePad;
