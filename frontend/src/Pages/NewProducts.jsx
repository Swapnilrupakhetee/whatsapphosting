import React, { useState } from 'react';
import '../Styles/PaymentReminder.css';
import { NewReleases } from "@mui/icons-material";
import FileUpload from '../Components/FileUpload';
import ImageUpload from '../Components/ImageUpload';

const NewProducts = () => {
    const [name, setName] = useState("Customer"); // Default name
    const [amount, setAmount] = useState("0");   // Default amount
    const [date, setDate] = useState("01/01/2024"); // Default date

    const handleFileUpload = (files) => {
        console.log('New Products Files:', files);
    };

    const defaultMessage = `Hello ${name}, your Rs.${amount} is missing and your payment is due since ${date}`;

    return (
        <>
            <div className='payment-reminder-container'>
                <div className='payment-reminder-content'>

                    <div className='payment-reminder-title'>
                        New Products <NewReleases />
                    </div>

                    <div className='drop-file'>
                        <FileUpload
                            onFileUpload={handleFileUpload}
                            acceptedFiles=".xlsx"
                            storageKey="newProductsFile"
                        />
                    </div>

                    <div className='textarea-container'>
                        <textarea
                            className='custom-textarea'
                            value={defaultMessage}
                            readOnly
                        />
                    </div>
                    <div className='image-upload-container'>
                    <ImageUpload/>
                    </div>
                    <div className='send-message-button'>
                    Send Message
                    </div>
                </div>
            </div>
        </>
    );
}

export default NewProducts;
