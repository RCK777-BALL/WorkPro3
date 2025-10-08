/*
 * SPDX-License-Identifier: MIT
 */

// Replaced Mantine components with standard HTML elements styled via Tailwind

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex justify-center py-8">
      <div className="flex flex-col items-center gap-2">
        <p className="text-red-500">{message}</p>
        {onRetry && (
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
