
import React, { useState, useCallback, useRef,useEffect } from 'react';
import * as XLSX from 'xlsx';
import { NotificationsActive } from '@mui/icons-material';
import { Warning } from '@mui/icons-material';

import FileUpload from '../Components/FileUpload';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../Styles/PaymentReminder.css';
import phoneNumberData from '../PaymentReminder.json';
import LoadingSpinner from '../Components/LoadingSpinner';


const PaymentReminder = () => {
  const [parsedData, setParsedData] = useState([]);
  const [formattedText, setFormattedText] = useState('No data loaded');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [phoneNumberData, setPhoneNumberData] = useState([]);
  const [missingEntries, setMissingEntries] = useState([]);
  const [isPhoneNumberProcessing, setIsPhoneNumberProcessing] = useState(false);


  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_REACT_APP_BACKEND_BASEURL;
  const CHUNK_SIZE = 10;


  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/info`);
        // Store just the array, not the whole response object
        setPhoneNumberData(response.data.data || []); 
        setStatus('Phone numbers loaded successfully');
      } catch (err) {
        console.error('Error fetching phone numbers:', err);
        setError(`Failed to fetch phone numbers: ${err.message}`);
        toast.error('Failed to fetch phone numbers from database');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchPhoneNumbers();
  }, []);
  


  const consolidateMessages = (whatsappMessages) => {
    // Group messages by phone number (manager)
    const groupedByManager = whatsappMessages.reduce((acc, message) => {
      const phoneNumber = message.phoneNumber;
      if (!phoneNumber) return acc;
      
      if (!acc[phoneNumber]) {
        acc[phoneNumber] = {
          parties: [],
          totalAmount: 0
        };
      }
      
      acc[phoneNumber].parties.push({
        partyName: message.partyName,
        outstandingAmount: parseFloat(message.outstandingAmount.replace(/,/g, '')),
        details: message.detailedContent
      });
      
      acc[phoneNumber].totalAmount += parseFloat(message.outstandingAmount.replace(/,/g, ''));
      
      return acc;
    }, {});

    // Format consolidated messages
    return Object.entries(groupedByManager).map(([phoneNumber, data]) => {
      const message = `Dear Manager,

This is a consolidated report of pending payments for all parties under your supervision:

${data.parties.map(party => `
== ${party.partyName} ==
Outstanding Amount: NPR ${party.outstandingAmount.toLocaleString('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
})}

Detailed Transactions:
${party.details}
`).join('\n')}

Total Outstanding Amount for All Parties: NPR ${data.totalAmount.toLocaleString('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
})}

Please follow up with the respective parties for payment collection.

Thank you for your cooperation.`;

      return {
        country_code: '977',
        number: phoneNumber.replace(/\D/g, ''),
        message
      };
    });
  };
  const sendBatchMessages = async (messages) => {
    try {
      setStatus('Sending consolidated messages...');
      const consolidated = consolidateMessages(messages);
      
      const response = await fetch(`${API_URL}/api/send-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: consolidated }),
      });


      const result = await response.json();
      
      if (result.success) {
        setStatus('Messages sent successfully');
      } else {
        throw new Error(result.error || 'Failed to send messages');
      }
    } catch (err) {
      setError(err.message);
      setStatus('Failed to send messages');
    }
  };


  const formatData = (jsonData) => {
    setIsPhoneNumberProcessing(true);
    let formattedEntries = [];
    let currentParty = null;
    let missingParties = new Set();
    
    try {
      const excelSerialToDate = (serial) => {
        if (!serial) return '';
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      };
  
      const getPhoneNumber = (partyName) => {
        if (!Array.isArray(phoneNumberData) || !partyName) {
          return null;
        }
        const normalizedPartyName = partyName.trim().toLowerCase();
        const contact = phoneNumberData.find(entry => {
          const entryName = entry["Name of Ledger"]?.trim().toLowerCase();
          return entryName === normalizedPartyName;
        });
        return contact ? contact.phone_number : null;
      };
  
      const dateRangeKey = Object.keys(jsonData[0]).find(key => 
        key.toLowerCase().includes('bills receivable')
      );
  
      jsonData.forEach((row) => {
        if (row.__EMPTY_2 && !row[dateRangeKey] && !row.__EMPTY_3) {
          currentParty = row.__EMPTY_2;
          return;
        }
  
        if (row[dateRangeKey] && typeof row[dateRangeKey] === 'number' && row.__EMPTY_3) {
          const phoneNumber = getPhoneNumber(currentParty);
          
          if (!phoneNumber) {
            missingParties.add(currentParty);
          }
          
          // Get the last column value for "send message"
          const values = Object.values(row);
          const sendMessage = values[values.length - 1];
          const chequeReceivedOn = values[values.length - 2] || '';
  
          // Only add entry if sendMessage is not 'n' or 'N'
          if (typeof sendMessage !== 'string' || !['n', 'N'].includes(sendMessage.trim())) {
            const entry = {
              partyName: currentParty,
              phoneNumber: phoneNumber,
              date: excelSerialToDate(row[dateRangeKey]),
              miti: row.__EMPTY || '',
              refNo: row.__EMPTY_1 || '',
              pendingAmount: parseFloat(row.__EMPTY_3) || 0,
              finalBalance: row.__EMPTY_4 ? parseFloat(row.__EMPTY_4) : 0,
              dueOn: row.__EMPTY_5 ? excelSerialToDate(row.__EMPTY_5) : '',
              ageOfBill: row.__EMPTY_6 || '',
              chequeReceivedOn: chequeReceivedOn ? excelSerialToDate(chequeReceivedOn) : '',
              sendMessage: sendMessage
            };
  
            if (entry.date && entry.pendingAmount) {
              formattedEntries.push(entry);
            }
          }
        }
      });
  
      setMissingEntries(Array.from(missingParties));
    } finally {
      setIsPhoneNumberProcessing(false);
    }
    return formattedEntries;
  };



  const prepareWhatsAppData = (formattedEntries) => {
    const filteredEntries = formattedEntries.filter(entry => {
      const age = parseInt(entry.ageOfBill, 10);
      return !isNaN(age) && age > 90;
    });
  
    const groupedByParty = filteredEntries.reduce((acc, entry) => {
      if (!acc[entry.partyName]) {
        acc[entry.partyName] = {
          entries: [],
          phoneNumber: entry.phoneNumber
        };
      }
      acc[entry.partyName].entries.push(entry);
      return acc;
    }, {});
  
    const summaries = Object.entries(groupedByParty).map(([partyName, partyData]) => {
      if (partyData.entries.length === 0) return null;
  
      const totalPending = partyData.entries
        .reduce((sum, e) => sum + (parseFloat(e.pendingAmount) || 0), 0);
  
      const detailedContent = partyData.entries.map(entry => 
        `Bill Date: ${entry.date}\n` +
        `Reference: ${entry.refNo}\n` +
        `Amount: NPR ${entry.pendingAmount.toLocaleString('en-IN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
        })}\n` +
        `Due Date: ${entry.dueOn}\n` +
        `Days Overdue: ${entry.ageOfBill}\n` +
        (entry.chequeReceivedOn ? `Cheque Received On: ${entry.chequeReceivedOn}\n` : '') +
        '----------------------------------------'
      ).join('\n');
  
      return {
        partyName,
        phoneNumber: partyData.phoneNumber,
        outstandingAmount: totalPending.toLocaleString('en-IN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
        }),
        detailedContent
      };
    }).filter(Boolean);
  
    return summaries;
  };



const handleFileUpload = (files) => {
  const file = files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: true,
        defval: ''
      });

      console.log('Raw Excel Data:', jsonData);

      const formattedData = formatData(jsonData);
      setParsedData(formattedData);

      const summaries = prepareWhatsAppData(formattedData);
      if (summaries.length === 0) {
        setStatus('No bills found that are more than 90 days overdue');
        toast.info('No bills found that are more than 90 days overdue');
      } else {
        setStatus(`Found ${summaries.length} parties with bills over 90 days overdue`);
        setWhatsappMessages(summaries);
      }


      // Group the data by party and include phone numbers
      const groupedData = formattedData.reduce((acc, entry) => {
        if (!acc[entry.partyName]) {
          acc[entry.partyName] = {
            entries: [],
            phoneNumber: entry.phoneNumber // Store the phone number at the party level
          };
        }
        acc[entry.partyName].entries.push(entry);
        return acc;
      }, {});

      // Create formatted text for display
      const text = Object.entries(groupedData).map(([partyName, partyData]) => {
        const entriesText = partyData.entries.map(entry =>
          `Date: ${entry.date}\n` +
          `Miti: ${entry.miti}\n` +
          `Ref No: ${entry.refNo}\n` +
          `Pending Amount: ${entry.pendingAmount.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
          })}\n` +
          `Final Balance: ${entry.finalBalance.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
          })}\n` +
          `Due on: ${entry.dueOn}\n` +
          (entry.ageOfBill ? `Age of Bill: ${entry.ageOfBill} days\n` : '') +
          '----------------------------------------'
        ).join('\n\n');

        return (
          `Party's Name: ${partyName}\n` +
          `Phone Number: ${partyData.phoneNumber || 'Not found'}\n` +
          '========================================\n\n' +
          entriesText
        );
      }).join('\n\n\n');

      setFormattedText(text || 'No data loaded');
      setStatus('File processed successfully');
      setError('');
      
      console.log('Formatted Text:', text);
      // Also log the phone number data for debugging
      console.log('Phone Number Data:', phoneNumberData);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file: ' + error.message);
      setFormattedText('Error processing file');
    }
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
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    console.log('Starting QR code request...');
    console.log('API URL being used:', API_URL); // Log the API URL

    const response = await axios.get(`${API_URL}/api/generate-qr`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    }).catch(error => {
      console.error('Axios request failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    });

    console.log('Server response received:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    if (response.data.success && response.data.qrCode) {
      console.log('QR code successfully generated');
      setQrCode(response.data.qrCode);
      setStatus('Scan the QR code with WhatsApp to connect');

      startPollingClientStatus();
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    console.error('QR generation error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      isAxiosError: error.isAxiosError,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });

    if (error.name === 'AbortError') {
      setError('Request timed out. Please try again.');
    } else if (error.response) {
      setError(`Server error: ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      setError('No response from server. Please check your connection.');
    } else {
      setError(`Error: ${error.message}`);
    }

    handleError(error);
  } finally {
    console.log('QR generation request completed');
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
      if (!whatsappMessages.length) {
        setError('No valid messages to send');
        return;
      }
    
      try {
        setStatus('Preparing messages...');
        setIsLoading(true);
        
        // Use the consolidateMessages function to group messages by manager
        const consolidated = consolidateMessages(whatsappMessages);
        
        if (!consolidated.length) {
          setError('No messages with valid phone numbers to send');
          return;
        }
    
        // Process one message at a time
        let successCount = 0;
        let failureCount = 0;
        const failedNumbers = [];
    
        for (let i = 0; i < consolidated.length; i++) {
          const message = consolidated[i];
          setStatus(`Sending message ${i + 1} of ${consolidated.length}...`);
    
          try {
            const response = await axios.post(`${API_URL}/api/send-messages`, {
              messages: [message] // Send just one message at a time
            });
    
            if (response.data.success) {
              successCount++;
            } else {
              failureCount++;
              failedNumbers.push(message.number);
            }
    
            // Add small delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Error sending message ${i + 1}:`, error);
            failureCount++;
            failedNumbers.push(message.number);
          }
        }
    
        if (successCount > 0) {
          toast.success(`Successfully sent ${successCount} messages`);
        }
    
        if (failureCount > 0) {
          toast.error(`Failed to send ${failureCount} messages. Failed numbers: ${failedNumbers.join(', ')}`);
        }
    
        // Reset states only if all messages were sent successfully
        if (failureCount === 0) {
          setParsedData([]);
          setWhatsappMessages([]);
          setQrCode('');
          setFormattedText('No data loaded');
          
          if (fileInputRef.current) {
            fileInputRef.current.value = null;
          }
        }
    
        setStatus(`Completed: ${successCount} sent, ${failureCount} failed`);
      } catch (error) {
        console.error('Send messages error:', error);
        const errorMessage = error.response?.data?.error || error.message;
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
  
  
    const handleError = (error) => {
      console.error('Operation failed:', error);
      const errorMessage = error.response?.data?.error 
        || error.message 
        || 'Unknown error occurred';
      
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (error.response) {
        setError(`Server error: ${errorMessage}`);
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError(`Error: ${errorMessage}`);
      }
      setStatus('');
      toast.error(errorMessage);
    };

  return (
    <div className="payment-reminder-container">
    <div className="payment-reminder-content">
      <div className="payment-reminder-title">
        Payment Reminder <NotificationsActive />
      </div>

      <div className="drop-file">
        <FileUpload
          ref={fileInputRef}
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

      {error && (
        <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
          {error}
        </div>
      )}
      {missingEntries.length > 0 && (
        <div className="missing-entries-container" style={{
          margin: '20px 0',
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeeba',
          borderRadius: '4px',
          color: '#856404'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Warning style={{ marginRight: '8px', color: '#856404' }} />
            <h4 style={{ margin: 0 }}>Missing Phone Numbers</h4>
          </div>
          <p style={{ margin: '0 0 10px 0' }}>The following parties do not have associated phone numbers in the database:</p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {missingEntries.map((party, index) => (
              <li key={index}>{party}</li>
            ))}
          </ul>
        </div>
      )}

      {qrCode && !isClientReady && (
        <div className="qr-code-container" style={{
          textAlign: 'center',
          margin: '20px 0',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}>
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
      {isPhoneNumberProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          }}>
            <LoadingSpinner 
              size="lg"
              text="Processing phone numbers..." 
            />
          </div>
        </div>
      )}

      <div className="textarea-container">
      {isLoading && parsedData.length === 0 ? (
        <div className="loading-container">
          <LoadingSpinner size="lg" text="Processing file..." />
        </div>
      ) : (
        <textarea
          className="custom-textarea"
          value={formattedText}
          readOnly
          style={{
            width: '100%',
            minHeight: '300px',
            maxHeight: '500px',
            overflowY: 'auto',
            padding: '10px',
            marginTop: '20px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
      )}
      </div>
      {isLoading && phoneNumberData.length === 0 && (
        <div className="loading-container">
          <LoadingSpinner text="Loading phone numbers..." />
        </div>
      )}
      <div className="button-container">
        {!isClientReady && whatsappMessages.length > 0 && (
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

        {isClientReady && whatsappMessages.length > 0 && (
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
    <ToastContainer />
  </div>
  );
};

export default PaymentReminder;