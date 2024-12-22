import React from 'react';
import '../Styles/PaymentReminder.css';
import {
    NotificationsActive,
    NewReleases,
  } from "@mui/icons-material";
import FileUpload from '../Components/FileUpload';
const PaymentReminder = () => {
    const handleFileUpload = (files) => {
        console.log('Payment Reminder Files:', files);
      };
  return (
    <>
    <div className='payment-reminder-container'>
    <div className='payment-reminder-content'>
    
      <div className='payment-reminder-title'>
      Reminder <NotificationsActive />
      </div>
        <div className='drop-file'>
        <FileUpload
        onFileUpload={handleFileUpload}
        acceptedFiles=".xlsx"
        storageKey="paymentReminderFile"
      />
        </div>
        </div>
    </div>
    </>
  );
}

export default PaymentReminder;
