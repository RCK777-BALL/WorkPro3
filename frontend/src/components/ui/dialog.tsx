/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handler = () => onOpenChange(false);
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
  }, [onOpenChange]);

  return (
    <dialog ref={ref} className="rounded-lg p-0 w-full max-w-lg backdrop:bg-black/50">
      {children}
    </dialog>
  );
}

export function DialogContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-neutral-600', className)} {...props}>
      {children}
    </p>
  );
}

export default Dialog;
