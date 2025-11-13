
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon } from '../constants';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [onFilesSelected]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-200 ${
        isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
        <UploadCloudIcon className="w-12 h-12 text-slate-400" />
        <p className="text-slate-600">
          <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500">Any audio format</p>
      </label>
    </div>
  );
};

export default FileUploader;
