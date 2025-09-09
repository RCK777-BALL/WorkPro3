import { Button, Center, Stack, Text } from '@mantine/core';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <Center py="xl">
      <Stack spacing="sm" align="center">
        <Text c="red">{message}</Text>
        {onRetry && (
          <Button variant="light" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    </Center>
  );
}
