import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFileExcel } from 'react-icons/fa';
import '../Styles/FileUpload.css';

function FileUpload({ onFileUpload, storageKey }) {
  const [uploadedFile, setUploadedFile] = useState(() => {
    const savedFile = localStorage.getItem(storageKey);
    return savedFile ? JSON.parse(savedFile) : null;
  });

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const fileData = {
          name: file.name,
          size: (file.size / 1024).toFixed(2), // Size in KB
        };
        setUploadedFile(fileData);
        localStorage.setItem(storageKey, JSON.stringify(fileData));
        onFileUpload(acceptedFiles);
      }
    },
    [onFileUpload, storageKey]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  useEffect(() => {
    const savedFile = localStorage.getItem(storageKey);
    if (savedFile) {
      setUploadedFile(JSON.parse(savedFile));
    }
  }, [storageKey]);

  return (
    <div 
      {...getRootProps()} 
      className={`dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {uploadedFile ? (
        <div className="file-info">
          <FaFileExcel className="excel-icon" />
          <span>{uploadedFile.name}</span>
        </div>
      ) : (
        <div className="upload-prompt">
          <FaFileExcel className="excel-icon" />
          <p>Drag 'n' drop an Excel file here, or click to select a file</p>
          <small>(.xlsx or .xls files only)</small>
        </div>
      )}
    </div>
  );
}

export default FileUpload;