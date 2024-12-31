// import React, { useState, useCallback, useRef } from 'react';
// import * as XLSX from 'xlsx';
// import { NotificationsActive } from '@mui/icons-material';
// import FileUpload from '../Components/FileUpload';
// import axios from 'axios';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for Toastify
// import '../Styles/PaymentReminder.css';

// const PaymentReminder = () => {
//   const [parsedData, setParsedData] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [status, setStatus] = useState('');
//   const [qrCode, setQrCode] = useState('');
//   const [error, setError] = useState('');
//   const [isClientReady, setIsClientReady] = useState(false);

//   const fileInputRef = useRef(null); // Reference for file input

//   const API_URL = 'http://localhost:5000';
//   const formatData = (jsonData) => {
//         let formattedEntries = [];
//         let currentParty = null;
//         let currentPhone = null;
//         let currentName = null;
//         jsonData.forEach((row) => {
//           // Check if this is a party name row
//           if (row.__EMPTY_2 && !row['16-Jul-2024 to 22-Dec-2024 (01-04-2081 to 07-09-2081)'] && 
//             !row.__EMPTY_3 && !row.__EMPTY_4) {
//           currentParty = row.__EMPTY_2;
//           // Reset phone and name for new party
//           currentPhone = null;
//           currentName = null;
//         }
//         // Check if this is a data row
//         else if (row['16-Jul-2024 to 22-Dec-2024 (01-04-2081 to 07-09-2081)'] && 
//                  typeof row['16-Jul-2024 to 22-Dec-2024 (01-04-2081 to 07-09-2081)'] === 'number') {
//           // Update current phone and name if present in this row
//           if (row.__EMPTY_7) currentPhone = row.__EMPTY_7;
//           if (row.__EMPTY_8) currentName = row.__EMPTY_8;
    
//           formattedEntries.push({
//             partyName: currentParty,
//             date: row['16-Jul-2024 to 22-Dec-2024 (01-04-2081 to 07-09-2081)'],
//             miti: row.__EMPTY,
//             refNo: row.__EMPTY_1,
//             pendingAmount: row.__EMPTY_3,
//             finalBalance: row.__EMPTY_4,
//             dueOn: row.__EMPTY_5,
//             ageOfBill: row.__EMPTY_6,
//             phone: currentPhone,
//             name: currentName
//           });
//         }
//       });
    
//       return formattedEntries;
//     };

//   const handleFileUpload = (files) => {
//   const file = files[0];
//   const reader = new FileReader();

//   reader.onload = (e) => {
//     try {
//       const data = e.target.result;
//       const workbook = XLSX.read(data, { type: 'array' });
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const jsonData = XLSX.utils.sheet_to_json(worksheet);

//       console.log('Raw Excel Data:', jsonData);

//       const formattedData = formatData(jsonData);
//       setParsedData(formattedData);

//       // Group entries by party name and maintain contact info
//       const groupedByParty = formattedData.reduce((acc, entry) => {
//         if (!acc[entry.partyName]) {
//           acc[entry.partyName] = {
//             entries: [],
//             phone: null,
//             name: null
//           };
//         }
//         // Update party's contact info if available
//         if (entry.phone) acc[entry.partyName].phone = entry.phone;
//         if (entry.name) acc[entry.partyName].name = entry.name;
//         acc[entry.partyName].entries.push(entry);
//         return acc;
//       }, {});

//       // Create formatted text for textarea
//       const text = Object.entries(groupedByParty)
//         .map(([partyName, data]) => {
//           const partyHeader = `Party's Name: ${partyName}\n` +
//                             `Phone: ${data.phone || 'N/A'}\n` +
//                             `Name: ${data.name || 'N/A'}\n` +
//                             '----------------------------------------\n';
          
//           const entriesText = data.entries
//             .map(entry => 
//               `Date: ${entry.date || 'N/A'}\n` +
//               `Miti: ${entry.miti || 'N/A'}\n` +
//               `Ref No: ${entry.refNo || 'N/A'}\n` +
//               `Pending Amount: ${entry.pendingAmount || 'N/A'}\n` +
//               `Final Balance: ${entry.finalBalance || 'N/A'}\n` +
//               `Due on: ${entry.dueOn || 'N/A'}\n` +
//               `Age of Bill in Days: ${entry.ageOfBill || 'N/A'}\n` +
//               '----------------------------------------'
//             )
//             .join('\n\n');
          
//           return partyHeader + entriesText;
//         })
//         .join('\n\n');

//       setFormattedText(text || 'No data loaded');
//       setStatus('File processed successfully');
//       setError('');
      
//       console.log('Formatted Text:', text);
//     } catch (error) {
//       console.error('Error processing file:', error);
//       setError('Error processing file: ' + error.message);
//       setFormattedText('Error processing file');
//     }
//   };

//   reader.readAsArrayBuffer(file);
// };

//   const generateQR = useCallback(async () => {
//     setIsLoading(true);
//     setError('');
//     setStatus('Generating QR Code...');
//     setQrCode('');
//     setIsClientReady(false);

//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 60000);

//     try {
//       console.log('Starting QR code request...');
//       const response = await axios.get(`${API_URL}/api/generate-qr`, {
//         signal: controller.signal,
//         headers: {
//           'Cache-Control': 'no-cache',
//           'Pragma': 'no-cache',
//         },
//       });

//       if (response.data.success && response.data.qrCode) {
//         setQrCode(response.data.qrCode);
//         setStatus('Scan the QR code with WhatsApp to connect');

//         // Start polling for client ready status
//         startPollingClientStatus();
//       } else {
//         throw new Error('Invalid response format from server');
//       }
//     } catch (error) {
//       handleError(error);
//     } finally {
//       clearTimeout(timeoutId);
//       setIsLoading(false);
//     }
//   }, [API_URL]);

//   const startPollingClientStatus = useCallback(async () => {
//     const pollInterval = setInterval(async () => {
//       try {
//         const response = await axios.get(`${API_URL}/api/client-status`);
//         if (response.data.isReady) {
//           setIsClientReady(true);
//           setStatus('WhatsApp connected! Ready to send messages.');
//           clearInterval(pollInterval);
//         }
//       } catch (error) {
//         console.error('Error checking client status:', error);
//       }
//     }, 2000); // Poll every 2 seconds

//     // Clear interval after 2 minutes to prevent indefinite polling
//     setTimeout(() => clearInterval(pollInterval), 120000);
//   }, [API_URL]);

//   const sendMessages = async () => {
//     if (!parsedData.length) {
//       setError('No data to send messages');
//       return;
//     }

//     setIsLoading(true);
//     setStatus('Sending messages...');

//     try {
//       const response = await axios.post(`${API_URL}/api/send-messages`, {
//         messages: parsedData,
//       });

//       if (response.data.success) {
//         setStatus('Messages sent successfully!');
//         const results = response.data.results;
//         const failedMessages = results.filter((r) => !r.success);

//         // Toast for each sent message
//         const sentTo = parsedData.map((row) => row.name).join(', ');
//         toast.success(`Messages sent to: ${sentTo}`);

//         if (failedMessages.length > 0) {
//           setError(`${failedMessages.length} messages failed to send.`);
//         }

//         // Clear data and reset file input
//         setParsedData([]);
//         setQrCode('');
//         fileInputRef.current.value = null; // Reset file input field
//       }
//     } catch (error) {
//       handleError(error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleError = (error) => {
//     console.error('Operation failed:', error);
//     if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
//       setError('Request timed out. Please try again.');
//     } else if (error.response) {
//       setError(`Server error: ${error.response.data.error || 'Unknown error'}`);
//     } else if (error.request) {
//       setError('No response from server. Please check your connection.');
//     } else {
//       setError(`Error: ${error.message}`);
//     }
//     setStatus('');
//   };

//   return (
//     <div className="payment-reminder-container">
//       <div className="payment-reminder-content">
//         <div className="payment-reminder-title">
//           Payment Reminder <NotificationsActive />
//         </div>

//         <div className="drop-file">
//           <FileUpload
//             ref={fileInputRef} // Set ref to file upload component
//             className="file-icon"
//             onFileUpload={handleFileUpload}
//             acceptedFiles=".xlsx"
//             storageKey="paymentReminderFile"
//           />
//         </div>

        

//         {status && (
//           <div className="status-message" style={{ color: '#666', margin: '10px 0' }}>
//             {status}
//           </div>
//         )}

//         {qrCode && !isClientReady && (
//           <div
//             className="qr-code-container"
//             style={{
//               textAlign: 'center',
//               margin: '20px 0',
//               padding: '20px',
//               border: '1px solid #ddd',
//               borderRadius: '8px',
//             }}
//           >
//             <img
//               src={qrCode}
//               alt="WhatsApp QR Code"
//               style={{
//                 maxWidth: '250px',
//                 width: '100%',
//                 height: 'auto',
//               }}
//             />
//           </div>
//         )}

//         <div className="textarea-container">
//           <textarea
//             className="custom-textarea"
//             value={
//               parsedData.length > 0
//                 ? parsedData
//                     .map(
//                       (row) =>
//                         `Name: ${row.name}, Phone: +${row.country_code}${row.number}, Days Late: ${row.daysLate}, Amount: NPR ${row.outstandingAmount}`
//                     )
//                     .join('\n')
//                 : 'No data loaded'
//             }
//             readOnly
//           />
//         </div>

//         <div className="button-container" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
//           {!isClientReady && (
//             <button
//               className="generate-qr-button"
//               onClick={generateQR}
//               disabled={isLoading}
//               style={{
//                 opacity: isLoading ? 0.7 : 1,
//                 cursor: isLoading ? 'not-allowed' : 'pointer',
//                 backgroundColor: '#25D366',
//                 color: 'white',
//                 padding: '12px 24px',
//                 border: 'none',
//                 borderRadius: '6px',
//                 fontSize: '16px',
//                 fontWeight: 'bold',
//                 marginTop: '20px',
//               }}
//             >
//               {isLoading ? 'Generating QR...' : 'Generate QR Code'}
//             </button>
//           )}

//           {isClientReady && parsedData.length > 0 && (
//             <button
//               className="send-messages-button"
//               onClick={sendMessages}
//               disabled={isLoading}
//               style={{
//                 opacity: isLoading ? 0.7 : 1,
//                 cursor: isLoading ? 'not-allowed' : 'pointer',
//                 backgroundColor: '#25D366',
//                 color: 'white',
//                 padding: '12px 24px',
//                 border: 'none',
//                 borderRadius: '6px',
//                 fontSize: '16px',
//                 fontWeight: 'bold',
//                 marginTop: '20px',
//               }}
//             >
//               {isLoading ? 'Sending Messages...' : 'Send Messages'}
//             </button>
//           )}
//         </div>
//       </div>

//       {/* ToastContainer for React Toastify */}
//       <ToastContainer />
//     </div>
//   );
// };
// export default PaymentReminder;



import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { NotificationsActive } from '@mui/icons-material';
import FileUpload from '../Components/FileUpload';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../Styles/PaymentReminder.css';

const PaymentReminder = () => {
  const [parsedData, setParsedData] = useState([]);
  const [formattedText, setFormattedText] = useState('No data loaded');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);
  const [whatsappMessages, setWhatsappMessages] = useState([]);


  const fileInputRef = useRef(null);
  const API_URL = 'http://localhost:5000';

  const formatData = (jsonData) => {
    let formattedEntries = [];
    let currentParty = null;
    let currentPhone = null;
    let currentName = null;

    // Helper function to convert Excel serial number to date string
    const excelSerialToDate = (serial) => {
        if (!serial) return '';
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Find the date column header (it will be the only column with an actual date range)
    const dateColumnKey = Object.keys(jsonData[0]).find(key => 
        key.includes('to') && key.includes('2024')
    );

    jsonData.forEach((row) => {
        // Check if this is a party name row
        if (row.__EMPTY_2 && !row[dateColumnKey] && 
            !row.__EMPTY_3 && !row.__EMPTY_4) {
            currentParty = row.__EMPTY_2;
            // Reset phone and name for new party
            currentPhone = null;
            currentName = null;
        }
        // Check if this is a data row
        else if (row[dateColumnKey] && 
                typeof row[dateColumnKey] === 'number') {
            // Update current phone and name if present in this row
            if (row.__EMPTY_7) currentPhone = row.__EMPTY_7;
            if (row.__EMPTY_8) currentName = row.__EMPTY_8;

            formattedEntries.push({
                partyName: currentParty,
                date: excelSerialToDate(row[dateColumnKey]),
                miti: row.__EMPTY,
                refNo: row.__EMPTY_1,
                pendingAmount: row.__EMPTY_3,
                finalBalance: row.__EMPTY_4,
                dueOn: excelSerialToDate(row.__EMPTY_5),
                ageOfBill: row.__EMPTY_6,
                phone: currentPhone,
                name: currentName
            });
        }
    });

    return formattedEntries;
};

const prepareWhatsAppData = (formattedEntries) => {
  const messages = [];
  const processedPhones = new Set();

  // Group all entries by their partyName
  const groupedByParty = formattedEntries.reduce((acc, entry) => {
    if (!acc[entry.partyName]) {
      acc[entry.partyName] = {
        entries: [],
        phone: null,
        name: null
      };
    }
    // Store contact info
    if (entry.phone) acc[entry.partyName].phone = entry.phone;
    if (entry.name) acc[entry.partyName].name = entry.name;
    acc[entry.partyName].entries.push(entry);
    return acc;
  }, {});

  // For each party that has a phone and name
  Object.entries(groupedByParty).forEach(([partyName, partyData]) => {
    if (partyData.phone && partyData.name && !processedPhones.has(partyData.phone)) {
      const cleanPhone = String(partyData.phone).replace(/\D/g, '');
      const country_code = "977";
      const number = cleanPhone;

      // Create detailed message content with all entries
      const detailedContent = partyData.entries.map(entry => 
        `Ref No: ${entry.refNo}\n` +
        `Pending Amount: NPR ${entry.pendingAmount}\n` +
        `Due Date: ${entry.dueOn}\n` +
        `Age of Bill: ${entry.ageOfBill} days\n`
      ).join('\n');

      // Calculate total pending amount for this party
      const totalPending = partyData.entries
        .reduce((sum, e) => sum + (parseFloat(e.pendingAmount) || 0), 0);

      messages.push({
        country_code,
        number,
        name: partyData.name,
        daysLate: Math.max(...partyData.entries.map(e => parseInt(e.ageOfBill) || 0)),
        outstandingAmount: totalPending.toFixed(2),
        detailedContent
      });

      processedPhones.add(partyData.phone);
    }
  });

  return messages;
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Raw Excel Data:', jsonData);

      const formattedData = formatData(jsonData);
      setParsedData(formattedData);

      const messages = prepareWhatsAppData(formattedData);
setWhatsappMessages(messages);

      // Group entries by party name and maintain contact info
      const groupedByParty = formattedData.reduce((acc, entry) => {
        if (!acc[entry.partyName]) {
          acc[entry.partyName] = {
            entries: [],
            phone: null,
            name: null
          };
        }
        // Update party's contact info if available
        if (entry.phone) acc[entry.partyName].phone = entry.phone;
        if (entry.name) acc[entry.partyName].name = entry.name;
        acc[entry.partyName].entries.push(entry);
        return acc;
      }, {});

      // Create formatted text for textarea
      const text = Object.entries(groupedByParty)
        .map(([partyName, data]) => {
          const partyHeader = `Party's Name: ${partyName}\n` +
                            `Phone: ${data.phone || 'N/A'}\n` +
                            `Name: ${data.name || 'N/A'}\n` +
                            '----------------------------------------\n';
          
          const entriesText = data.entries
            .map(entry => 
              `Date: ${entry.date || 'N/A'}\n` +
              `Miti: ${entry.miti || 'N/A'}\n` +
              `Ref No: ${entry.refNo || 'N/A'}\n` +
              `Pending Amount: ${entry.pendingAmount || 'N/A'}\n` +
              `Final Balance: ${entry.finalBalance || 'N/A'}\n` +
              `Due on: ${entry.dueOn || 'N/A'}\n` +
              `Age of Bill in Days: ${entry.ageOfBill || 'N/A'}\n` +
              '----------------------------------------'
            )
            .join('\n\n');
          
          return partyHeader + entriesText;
        })
        .join('\n\n');

      setFormattedText(text || 'No data loaded');
      setStatus('File processed successfully');
      setError('');
      
      console.log('Formatted Text:', text);
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
      if (!whatsappMessages.length) {
        setError('No valid messages to send');
        return;
      }
    
      setIsLoading(true);
      setStatus('Sending messages...');
    
      try {
        const response = await axios.post(`${API_URL}/api/send-messages`, {
          messages: whatsappMessages,
        });
    
        if (response.data.success) {
          setStatus('Messages sent successfully!');
          const results = response.data.results;
          const failedMessages = results.filter((r) => !r.success);
    
          const sentTo = whatsappMessages.map((msg) => msg.name).join(', ');
          toast.success(`Messages sent to: ${sentTo}`);
    
          if (failedMessages.length > 0) {
            setError(`${failedMessages.length} messages failed to send.`);
          }
    
          // Reset states
          setParsedData([]);
          setWhatsappMessages([]);
          setQrCode('');
          setFormattedText('No data loaded');
          
          // Safely reset file input if it exists
          if (fileInputRef.current) {
            fileInputRef.current.value = null;
          }
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

      <div className="textarea-container">
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
      </div>

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