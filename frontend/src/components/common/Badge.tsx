/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";
import { colors, getStatusColor, getPriorityColor } from "@/utils/colors";

// Convert a hex color code to an rgba string with the provided alpha value
const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type BadgeType =
  | "status"
  | "priority"
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info";

interface BadgeProps {
  text: string;
  type?: BadgeType;
  size?: "sm" | "md";
  className?: string;
  /** Override the resolved color with an explicit value */
  color?: string;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  type = "default",
  size = "md",
  className = "",
  color,
}) => {
  const baseColor = React.useMemo(() => {
    if (color) return color;
    if (type === "status") return getStatusColor(text);
    if (type === "priority") return getPriorityColor(text);
    if (type === "success") return colors.success[500];
    if (type === "warning") return colors.warning[500];
    if (type === "error") return colors.error[600];
    if (type === "info") return colors.primary[600];
    return "";
  }, [color, text, type]);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  if (!baseColor) {
    return (
      <span
        className={`inline-flex items-center justify-center font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 ${sizeClasses[size]} ${className}`}
      >
        {text}
      </span>
    );
  }

  const style = {
    "--badge-text-light": baseColor,
    "--badge-text-dark": hexToRgba(baseColor, 0.9),
    "--badge-bg-light": hexToRgba(baseColor, 0.1),
    "--badge-bg-dark": hexToRgba(baseColor, 0.2),
  } as React.CSSProperties;

  return (
    <span
      style={style}
      className={`inline-flex items-center justify-center font-medium rounded-full text-[var(--badge-text-light)] dark:text-[var(--badge-text-dark)] bg-[var(--badge-bg-light)] dark:bg-[var(--badge-bg-dark)] ${sizeClasses[size]} ${className}`}
    >
      {text}
    </span>
  );
};

export default Badge;
