/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Copy } from 'lucide-react';
import Button from './Button';

interface DuplicateButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

const DuplicateButton: React.FC<DuplicateButtonProps> = ({
  onClick,
  label = 'Duplicate',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={<Copy size={16} />}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {label}
    </Button>
  );
};

export default DuplicateButton;
