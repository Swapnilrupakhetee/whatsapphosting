import React from 'react';
import '../Styles/PaymentReminder.css';
import {
    NotificationsActive,
    NewReleases,
  } from "@mui/icons-material";
import FileUpload from '../Components/FileUpload';
const PaymentReminder = () => {
  return (
    <>
    <div className='payment-reminder-container'>
    <div className='payment-reminder-content'>
    
      <div className='payment-reminder-title'>
      Reminder <NotificationsActive />
      </div>
        <div className='drop-file'>
        <FileUpload/>
        </div>
        </div>
    </div>
    </>
  );
}

export default PaymentReminder;
