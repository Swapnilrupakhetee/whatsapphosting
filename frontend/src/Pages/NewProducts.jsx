import React from 'react';
import '../Styles/PaymentReminder.css';
import {
    
    NewReleases
  } from "@mui/icons-material";
const NewProducts = () => {
  return (
    <>
      <div className='payment-reminder-container'>
      <div className='payment-reminder-title'>
            New Products <NewReleases />
            </div>
    </div>
    </>
  );
}

export default NewProducts;
