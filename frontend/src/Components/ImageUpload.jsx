import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaImage, FaTimes } from 'react-icons/fa';

const ImageUpload = ({ onImageUpload, maxFiles = 5 }) => {
  const [errors, setErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const newErrors = rejectedFiles.map(file => ({
        file: file.file.name,
        errors: file.errors.map(error => error.message)
      }));
      setErrors(newErrors);
      return;
    }

    // Clear errors if successful
    setErrors([]);
    
    // Process accepted files
    onImageUpload(acceptedFiles);
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles,
    maxSize: 5242880, // 5MB
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        <FaImage className="mx-auto text-4xl mb-4 text-gray-400" />
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Drag and drop images here, or click to select files
          </p>
          <p className="text-xs text-gray-500">
            Supports: JPG, PNG, GIF (max {maxFiles} files, up to 5MB each)
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4">
          {errors.map((error, index) => (
            <div 
              key={index} 
              className="text-sm text-red-500 bg-red-50 p-2 rounded mb-2"
            >
              <p className="font-medium">{error.file}:</p>
              <ul className="list-disc list-inside">
                {error.errors.map((err, i) => (
                  <li key={i} className="ml-2">{err}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;