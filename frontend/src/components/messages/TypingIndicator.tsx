/*
 * SPDX-License-Identifier: MIT
 */

import { Text } from '@mantine/core';

interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (!users.length) return null;
  const label = users.length === 1 ? `${users[0]} is typing…` : `${users.slice(0, 2).join(', ')} are typing…`;
  return (
    <div className="px-4 py-2">
      <div className="rounded-full bg-indigo-500/10 px-4 py-2">
        <Text size="sm" className="text-indigo-200">
          {label}
        </Text>
      </div>
    </div>
  );
};

export default TypingIndicator;
