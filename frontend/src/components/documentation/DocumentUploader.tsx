import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import Button from '../common/Button';
import type { DocumentMetadata } from '../../utils/documentation';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => void;
  acceptedTypes?: string[];
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUpload,
  acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-neutral-300 hover:border-primary-500'}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-neutral-400" />
      <p className="mt-2 text-sm text-neutral-600">
        {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select files'}
      </p>
      <p className="text-xs text-neutral-500 mt-1">
        Supports PDF, Word, and Excel documents
      </p>
    </div>
  );
};

export default DocumentUploader;
