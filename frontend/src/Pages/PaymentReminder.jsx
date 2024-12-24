import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { NotificationsActive } from '@mui/icons-material';
import FileUpload from '../Components/FileUpload';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for Toastify
import '../Styles/PaymentReminder.css';

const PaymentReminder = () => {
  const [parsedData, setParsedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);

  const fileInputRef = useRef(null); // Reference for file input

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

      const formattedData = jsonData.map((row) => ({
        country_code: row.country_code?.toString(),
        number: row.number?.toString(),
        name: row.name,
        daysLate: parseInt(row.daysLate),
        outstandingAmount: parseFloat(row.outstandingAmount),
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
    setIsClientReady(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      console.log('Starting QR code request...');
      const response = await axios.get(`${API_URL}/api/generate-qr`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (response.data.success && response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setStatus('Scan the QR code with WhatsApp to connect');

        // Start polling for client ready status
        startPollingClientStatus();
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      handleError(error);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [API_URL]);

  const startPollingClientStatus = useCallback(async () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/client-status`);
        if (response.data.isReady) {
          setIsClientReady(true);
          setStatus('WhatsApp connected! Ready to send messages.');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error checking client status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Clear interval after 2 minutes to prevent indefinite polling
    setTimeout(() => clearInterval(pollInterval), 120000);
  }, [API_URL]);

  const sendMessages = async () => {
    if (!parsedData.length) {
      setError('No data to send messages');
      return;
    }

    setIsLoading(true);
    setStatus('Sending messages...');

    try {
      const response = await axios.post(`${API_URL}/api/send-messages`, {
        messages: parsedData,
      });

      if (response.data.success) {
        setStatus('Messages sent successfully!');
        const results = response.data.results;
        const failedMessages = results.filter((r) => !r.success);

        // Toast for each sent message
        const sentTo = parsedData.map((row) => row.name).join(', ');
        toast.success(`Messages sent to: ${sentTo}`);

        if (failedMessages.length > 0) {
          setError(`${failedMessages.length} messages failed to send.`);
        }

        // Clear data and reset file input
        setParsedData([]);
        setQrCode('');
        fileInputRef.current.value = null; // Reset file input field
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error) => {
    console.error('Operation failed:', error);
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
  };

  return (
    <div className="payment-reminder-container">
      <div className="payment-reminder-content">
        <div className="payment-reminder-title">
          Payment Reminder <NotificationsActive />
        </div>

        <div className="drop-file">
          <FileUpload
            ref={fileInputRef} // Set ref to file upload component
            className="file-icon"
            onFileUpload={handleFileUpload}
            acceptedFiles=".xlsx"
            storageKey="paymentReminderFile"
          />
        </div>

        

        {status && (
          <div className="status-message" style={{ color: '#666', margin: '10px 0' }}>
            {status}
          </div>
        )}

        {qrCode && !isClientReady && (
          <div
            className="qr-code-container"
            style={{
              textAlign: 'center',
              margin: '20px 0',
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
          >
            <img
              src={qrCode}
              alt="WhatsApp QR Code"
              style={{
                maxWidth: '250px',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        )}

        <div className="textarea-container">
          <textarea
            className="custom-textarea"
            value={
              parsedData.length > 0
                ? parsedData
                    .map(
                      (row) =>
                        `Name: ${row.name}, Phone: +${row.country_code}${row.number}, Days Late: ${row.daysLate}, Amount: NPR ${row.outstandingAmount}`
                    )
                    .join('\n')
                : 'No data loaded'
            }
            readOnly
          />
        </div>

        <div className="button-container" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!isClientReady && (
            <button
              className="generate-qr-button"
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
                marginTop: '20px',
              }}
            >
              {isLoading ? 'Generating QR...' : 'Generate QR Code'}
            </button>
          )}

          {isClientReady && parsedData.length > 0 && (
            <button
              className="send-messages-button"
              onClick={sendMessages}
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
                marginTop: '20px',
              }}
            >
              {isLoading ? 'Sending Messages...' : 'Send Messages'}
            </button>
          )}
        </div>
      </div>

      {/* ToastContainer for React Toastify */}
      <ToastContainer />
    </div>
  );
};

export default PaymentReminder;
