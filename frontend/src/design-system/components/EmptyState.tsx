/*
 * SPDX-License-Identifier: MIT
 */

// Replaced Mantine components with standard HTML elements styled via Tailwind

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No data available' }: EmptyStateProps) {
  return (
    <div className="flex justify-center py-8">
      <div className="flex flex-col items-center gap-2">
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  );
}
