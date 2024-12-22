import React from 'react';
import '../Styles/PaymentReminder.css';
import {
    
    NewReleases
  } from "@mui/icons-material";
import FileUpload from '../Components/FileUpload';
const NewProducts = () => {
  return (
    <>
    <div className='payment-reminder-container'>
    <div className='payment-reminder-content'>
    
      <div className='payment-reminder-title'>
      New Products <NewReleases />
      </div>
        <div className='drop-file'>
        <FileUpload/>
        </div>
        </div>
    </div>
    </>
  );
}

export default NewProducts;
