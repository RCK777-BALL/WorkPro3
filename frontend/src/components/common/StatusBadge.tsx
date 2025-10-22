/*
 * SPDX-License-Identifier: MIT
 */

import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  active: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-neutral-200 text-neutral-700",
  critical: "bg-red-100 text-red-700",
  pending: "bg-indigo-100 text-indigo-700",
};

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

const sizeClasses: Record<Required<StatusBadgeProps>["size"], string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = status.trim().toLowerCase();
  const tone = STATUS_COLORS[normalized] ?? "bg-neutral-200 text-neutral-700";

  return (
    <span className={clsx("inline-flex items-center rounded-full font-medium capitalize", tone, sizeClasses[size])}>
      {status}
    </span>
  );
}
