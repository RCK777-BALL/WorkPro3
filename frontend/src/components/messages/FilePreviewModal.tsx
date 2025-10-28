/*
 * SPDX-License-Identifier: MIT
 */

import { Button, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';

interface FilePreviewModalProps {
  opened: boolean;
  files: File[];
  onClose: () => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
}

const formatSize = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const FilePreviewModal = ({ opened, files, onClose, onRemove, onConfirm }: FilePreviewModalProps) => (
  <Modal opened={opened} onClose={onClose} title="Attachment preview" size="lg" centered>
    <Stack gap="md">
      <ScrollArea style={{ maxHeight: 260 }}>
        <Stack gap="sm">
          {files.map((file, index) => (
            <Group
              key={`${file.name}-${index}`}
              justify="space-between"
              className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2"
            >
              <div>
                <Text className="text-sm font-medium text-white">{file.name}</Text>
                <Text size="xs" className="text-gray-400">
                  {file.type || 'Unknown type'} — {formatSize(file.size)}
                </Text>
              </div>
              <Button variant="subtle" color="red" size="xs" onClick={() => onRemove(index)}>
                Remove
              </Button>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="indigo" onClick={onConfirm}>
          Send {files.length > 1 ? `${files.length} files` : 'file'}
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default FilePreviewModal;
