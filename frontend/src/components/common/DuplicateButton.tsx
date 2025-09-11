/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Copy } from 'lucide-react';
import Button from './Button';

interface DuplicateButtonProps {
  onClick: () => void;
  label?: string;
}

const DuplicateButton: React.FC<DuplicateButtonProps> = ({ 
  onClick, 
  label = 'Duplicate'
}) => {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={<Copy size={16} />}
      onClick={onClick}
    >
      {label}
    </Button>
  );
};

export default DuplicateButton;
