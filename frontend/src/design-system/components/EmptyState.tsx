/*
 * SPDX-License-Identifier: MIT
 */

import { Center, Stack, Text } from '@mantine/core';

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No data available' }: EmptyStateProps) {
  return (
    <Center py="xl">
      <Stack gap="sm" align="center">
        <Text c="dimmed">{message}</Text>
      </Stack>
    </Center>
  );
}
