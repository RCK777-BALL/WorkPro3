/*
 * SPDX-License-Identifier: MIT
 */

import React from "react";

import { colors } from "@/utils/colors";

type TagColor = "red" | "green" | "yellow" | "blue" | "gray" | string;

interface TagProps {
  label: string;
  color?: TagColor;
  className?: string;
}

const colorMap: Record<string, string> = {
  red: colors.error[600],
  green: colors.success[600],
  yellow: colors.warning[500],
  blue: colors.primary[600],
  gray: colors.neutral[500],
};

const Tag: React.FC<TagProps> = ({ label, color = "gray", className = "" }) => {
  const resolvedColor = colorMap[color] ?? color;
  const style = {
    "--tag-bg": `${resolvedColor}20`,
    "--tag-text": resolvedColor,
  } as React.CSSProperties;

  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-[var(--tag-text)] bg-[var(--tag-bg)] ${className}`}
    >
      {label}
    </span>
  );
};

export default Tag;
