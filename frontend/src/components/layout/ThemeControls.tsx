/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, Monitor, Moon, Palette, Pipette, Sun } from 'lucide-react';

import { useTheme } from '@/context/ThemeContext';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: LucideIcon;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const BACKGROUND_PRESETS = ['#0f172a', '#1e293b', '#020617', '#334155', '#0ea5e9', '#1d4ed8', '#f8fafc'];
const TEXT_PRESETS = ['#f8fafc', '#e2e8f0', '#cbd5f5', '#0f172a', '#1e293b', '#082f49', '#111827'];

const ThemeControls = () => {
  const {
    theme,
    setTheme,
    backgroundColor,
    setBackgroundColor,
    textColor,
    setTextColor,
    resetColors,
  } = useTheme();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const themeButtons = useMemo(
    () =>
      THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
              isActive
                ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-200'
                : 'border-slate-300 bg-white/80 text-slate-700 hover:border-slate-400 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        );
      }),
    [setTheme, theme],
  );

  const renderColorPreset = (color: string, selected: string, onSelect: (color: string) => void) => (
    <button
      key={color}
      type="button"
      onClick={() => onSelect(color)}
      className={`relative h-8 w-8 rounded-full border transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
        selected === color
          ? 'border-sky-500'
          : 'border-slate-300 dark:border-white/30'
      }`}
      style={{ backgroundColor: color }}
      aria-label={`Use color ${color}`}
    >
      {selected === color ? (
        <Check className="h-4 w-4 text-white mix-blend-difference" />
      ) : null}
    </button>
  );

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-500"
        aria-label="Toggle theme controls"
      >
        <Palette className="h-5 w-5" />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-3 w-72 space-y-4 rounded-2xl border border-slate-200/70 bg-white/95 p-4 text-sm text-slate-700 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-100"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              Appearance
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">{themeButtons}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              <span>Background</span>
              <span className="text-[10px] text-slate-400 dark:text-white/40">Pick a color</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_PRESETS.map((color) =>
                renderColorPreset(color, backgroundColor, setBackgroundColor),
              )}
              <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition hover:border-slate-400 hover:text-slate-500 dark:border-white/30 dark:text-white/50 dark:hover:border-white/50 dark:hover:text-white/70">
                <Pipette className="h-4 w-4" />
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  className="sr-only"
                  aria-label="Choose custom background color"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
              <span>Text</span>
              <span className="text-[10px] text-slate-400 dark:text-white/40">Pick a color</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEXT_PRESETS.map((color) => renderColorPreset(color, textColor, setTextColor))}
              <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition hover:border-slate-400 hover:text-slate-500 dark:border-white/30 dark:text-white/50 dark:hover:border-white/50 dark:hover:text-white/70">
                <Pipette className="h-4 w-4" />
                <input
                  type="color"
                  value={textColor}
                  onChange={(event) => setTextColor(event.target.value)}
                  className="sr-only"
                  aria-label="Choose custom text color"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetColors();
            }}
            className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-white/20 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/30 dark:hover:bg-white/10"
          >
            Reset colors to theme defaults
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ThemeControls;
