/*
 * SPDX-License-Identifier: MIT
 */

import { Fragment, useEffect, useMemo, useRef } from "react";
import { Bell, CheckCircle2, Clock, Info } from "lucide-react";

import clsx from "clsx";

type NotificationMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Notification = {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  tone: "info" | "success" | "warning";
};

const NOTIFICATIONS: Notification[] = [
  {
    id: "scheduled-maintenance",
    title: "Scheduled maintenance ready",
    description: "Line 4 PM starts in 30 minutes.",
    timeAgo: "5m ago",
    tone: "info",
  },
  {
    id: "work-order-complete",
    title: "WO-2486 closed",
    description: "Technician Rivera completed the repair.",
    timeAgo: "32m ago",
    tone: "success",
  },
  {
    id: "safety-check",
    title: "Safety check required",
    description: "Forklift 12 requires a daily inspection.",
    timeAgo: "1h ago",
    tone: "warning",
  },
];

const toneToClasses: Record<Notification["tone"], string> = {
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

export default function NotificationMenu({ open, onOpenChange }: NotificationMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  const unreadCount = useMemo(() => NOTIFICATIONS.length, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className={clsx(
          "relative flex h-10 w-10 items-center justify-center rounded-full",
          "border border-slate-700 bg-slate-900 text-slate-200 transition",
          "hover:border-slate-600 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? "Close notifications" : "Open notifications"}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur"
        >
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200">
            <span>Notifications</span>
            <button
              type="button"
              className="text-xs text-primary-300 transition hover:text-primary-200 focus:outline-none"
              onClick={() => onOpenChange(false)}
            >
              Mark all as read
            </button>
          </header>
          <div className="divide-y divide-slate-800 bg-slate-900/70">
            {NOTIFICATIONS.map((notification) => (
              <Fragment key={notification.id}>
                <article className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={clsx(
                      "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full",
                      toneToClasses[notification.tone],
                    )}
                    aria-hidden
                  >
                    {notification.tone === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : notification.tone === "warning" ? (
                      <Info className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </span>
                  <div className="flex-1 text-sm text-slate-200">
                    <p className="font-medium text-slate-100">{notification.title}</p>
                    <p className="mt-1 text-slate-300">{notification.description}</p>
                    <p className="mt-2 text-xs text-slate-500">{notification.timeAgo}</p>
                  </div>
                </article>
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
