import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FaFileExcel } from "react-icons/fa6";
import '../Styles/FileUpload.css'

function FileUpload({ onFileUpload }) {
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const fileData = {
          name: file.name,
          size: (file.size / 1024).toFixed(2), // Size in KB
        };
        setUploadedFile(fileData);
        onFileUpload(acceptedFiles);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? "active" : ""}`}
    >
      <input {...getInputProps()} />
      {uploadedFile ? (
        <div className="file-info">
          <FaFileExcel className="file-icon" />
          <span>{uploadedFile.name}</span>
        </div>
      ) : (
        <div className="upload-prompt">
          <FaFileExcel className="file-icon" />
          <p>Drag 'n' drop an Excel file here, or click to select a file</p>
          <small>(.xlsx or .xls files only)</small>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
