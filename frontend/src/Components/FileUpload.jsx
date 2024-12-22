import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaFileExcel } from 'react-icons/fa'; // Excel file icon
import '../Styles/FileUpload.css';

function FileUpload({ onFileUpload, acceptedFiles }) {
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024).toFixed(2), // Size in KB
      });
      onFileUpload(acceptedFiles);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {uploadedFile ? (
        <div className="file-display">
          <FaFileExcel className="file-icon" /> {/* Excel file icon */}
          <span className="file-name">{uploadedFile.name}</span>
        </div>
      ) : (
        <p>Drag 'n' drop an .xlsx file here, or click to select a file</p>
      )}
    </div>
  );
}

export default FileUpload;
