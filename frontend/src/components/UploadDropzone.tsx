import React from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFiles, accept }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onFiles(files),
    accept: accept ? Object.fromEntries(accept.map((type) => [type, []])) : undefined,
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-lg border border-dashed p-6 text-center text-sm ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-neutral-300'
      }`}
    >
      <input {...getInputProps()} />
      {isDragActive ? 'Drop files here…' : 'Drag files here or click to upload.'}
    </div>
  );
};

export default UploadDropzone;
