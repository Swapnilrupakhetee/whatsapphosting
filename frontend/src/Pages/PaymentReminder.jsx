import React from 'react';
import '../Styles/PaymentReminder.css';
import {
    NotificationsActive,
    NewReleases,
  } from "@mui/icons-material";
const PaymentReminder = () => {
  return (
    <>
    <div className='payment-reminder-container'>
      <div className='payment-reminder-title'>
      PaymentReminder <NotificationsActive />
      </div>

    </div>
    </>
  );
}

export default PaymentReminder;
