import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFileExcel } from 'react-icons/fa';
import '../Styles/FileUpload.css';
import { FaImage } from "react-icons/fa";

function ImageUpload({ onFileUpload, acceptedFiles, storageKey }) {
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
    accept: acceptedFiles,
  });

  useEffect(() => {
    const savedFile = localStorage.getItem(storageKey);
    if (savedFile) {
      setUploadedFile(JSON.parse(savedFile));
    }
  }, [storageKey]);

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {uploadedFile ? (
        <div className="file-display">
        <FaImage  className="file-icon" />
          <span className="file-name">{uploadedFile.name}</span>
        </div>
      ) : (
        <p>Upload Image</p>
      )}
    </div>
  );
}

export default ImageUpload;
