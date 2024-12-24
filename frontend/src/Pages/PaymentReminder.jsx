import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { NotificationsActive } from '@mui/icons-material';
import FileUpload from '../Components/FileUpload';
import axios from 'axios';

const PaymentReminder = () => {
  const [parsedData, setParsedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:5000';

  const handleFileUpload = (files) => {
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map(row => ({
        country_code: row.country_code?.toString(),
        number: row.number?.toString(),
        name: row.name,
        daysLate: parseInt(row.daysLate),
        outstandingAmount: parseFloat(row.outstandingAmount)
      }));

      setParsedData(formattedData);
      setStatus('File processed successfully');
      setError('');
    };

    reader.readAsArrayBuffer(file);
  };

  const generateQR = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setStatus('Generating QR Code...');
    setQrCode('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log('Starting QR code request...');
      const response = await axios.get(`${API_URL}/api/generate-qr`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.data.success && response.data.qrCode) {
        console.log('QR code received, length:', response.data.qrCode.length);
        setQrCode(response.data.qrCode);
        setStatus('Scan the QR code with WhatsApp to connect');
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (error.response) {
        setError(`Server error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError(`Error: ${error.message}`);
      }
      
      setStatus('');
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [API_URL]);

  return (
    <div className="payment-reminder-container">
      <div className="payment-reminder-content">
        <div className="payment-reminder-title">
          Reminder <NotificationsActive />
        </div>
        
        <div className="drop-file">
          <FileUpload
            onFileUpload={handleFileUpload}
            acceptedFiles=".xlsx"
            storageKey="paymentReminderFile"
          />
        </div>

        {error && (
          <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
            {error}
          </div>
        )}

        {qrCode && (
          <div className="qr-code-container" style={{ 
            textAlign: 'center', 
            margin: '20px 0',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <img 
              src={qrCode} 
              alt="WhatsApp QR Code" 
              style={{ 
                maxWidth: '250px',
                width: '100%',
                height: 'auto'
              }} 
            />
            <p style={{ marginTop: '10px', color: '#666' }}>
              {status}
            </p>
          </div>
        )}

        <div className="textarea-container">
          <textarea 
            className="custom-textarea"
            value={parsedData.length > 0 ? 
              parsedData.map(row => 
                `Name: ${row.name}, Phone: +${row.country_code}${row.number}, Days Late: ${row.daysLate}, Amount: NPR ${row.outstandingAmount}`
              ).join('\n')
              : status
            }
            readOnly
          />
        </div>

        <button 
          className="send-message-button"
          onClick={generateQR}
          disabled={isLoading}
          style={{ 
            opacity: isLoading ? 0.7 : 1, 
            cursor: isLoading ? 'not-allowed' : 'pointer',
            backgroundColor: '#25D366',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '20px'
          }}
        >
          {isLoading ? 'Generating QR...' : 'Generate QR Code'}
        </button>
      </div>
    </div>
  );
};

export default PaymentReminder;