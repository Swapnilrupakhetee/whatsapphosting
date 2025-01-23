import React, { useState, useCallback, useRef } from 'react';
import '../Styles/PaymentReminder.css';
import { NewReleases } from "@mui/icons-material";
import FileUpload from '../Components/FileUpload';
import ImageUpload from '../Components/ImageUpload';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const NewProducts = () => {
    const [parsedData, setParsedData] = useState([]);
    const [selectedImages, setSelectedImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [categories, setCategories] = useState([]);
    const [isClientReady, setIsClientReady] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const [customMessage, setCustomMessage] = useState('');

    const fileInputRef = useRef(null);
    const API_URL = 'http://localhost:5000';

    const handleFileUpload = (files) => {
        const file = files[0];
        const reader = new FileReader();
    
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,  // This ensures numbers are read as strings
                defval: ''   // Default value for empty cells
            });
    
            const formattedData = jsonData.map((row) => {
                // Extract the raw values
                const num = row.Num?.toString() || '';
                const category = row.Category?.toString() || '';
                const name = row.Name?.toString() || '';
                const price = row.Price?.toString() || '0';
                const minQuantity = row['Min Quantity']?.toString() || '0';
                const countryCode = row.CountryCode?.toString() || '977';
    
                // Clean and format the phone number
                let cleanNum = num.replace(/[^\d]/g, '');
                
                // Remove country code from number if it's present
                if (cleanNum.startsWith(countryCode)) {
                    cleanNum = cleanNum.slice(countryCode.length);
                } else if (cleanNum.startsWith('0')) {
                    cleanNum = cleanNum.slice(1);
                }
    
                return {
                    number: cleanNum,
                    countryCode: countryCode,
                    category: category,
                    name: name,
                    price: parseFloat(price) || 0,
                    minQuantity: parseInt(minQuantity, 10) || 0
                };
            });
    
            // Validate the data
            const validData = formattedData.filter(item => {
                const isValidPhone = item.number && /^\d{10}$/.test(item.number); // Expecting 10 digits after country code
                const isValidPrice = !isNaN(item.price) && item.price > 0;
                const isValidQuantity = !isNaN(item.minQuantity) && item.minQuantity > 0;
                
                return isValidPhone && 
                       item.category.trim() !== '' && 
                       item.name.trim() !== '' && 
                       isValidPrice && 
                       isValidQuantity;
            });
    
            console.log('Processed valid data:', validData);
            setParsedData(validData);
            setCategories([...new Set(validData.map(item => item.category))]);
            setStatus(`Processed ${validData.length} valid entries`);
        };
    
        reader.readAsArrayBuffer(file);
    };

    
    const handleImageUpload = (files) => {
        console.log('Files received:', files);
        const newImages = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        console.log('Processed images:', newImages);
        setSelectedImages(prevImages => [...prevImages, ...newImages]);
        console.log('Current selected images:', selectedImages);
    };

    const removeImage = (index) => {
        setSelectedImages(prevImages => prevImages.filter((_, i) => i !== index));
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
                    setQrCode(''); // Hide QR code once connected
                    clearInterval(pollInterval);
                }
            } catch (error) {
                console.error('Error checking client status:', error);
            }
        }, 2000);

        setTimeout(() => clearInterval(pollInterval), 120000);
    }, [API_URL]);

    const sendMessages = async () => {
        const filteredData = getFilteredData();
    
        if (!filteredData.length) {
            setError('No data to send messages');
            return;
        }
    
        if (!selectedImages.length) {
            setError('Please select at least one product image');
            return;
        }
    
        setIsLoading(true);
        setStatus('Sending messages...');
    
        try {
            const formData = new FormData();
            selectedImages.forEach((image) => {
                formData.append('images', image.file);
            });
    
            const imageUploadResponse = await axios.post(`${API_URL}/api/upload-images`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
    
            if (!imageUploadResponse.data.imagePaths) {
                throw new Error('Image upload failed. Please try again.');
            }
    
            const imagePaths = imageUploadResponse.data.imagePaths;
            const response = await axios.post(`${API_URL}/api/send-product-messages`, {
                messages: filteredData,
                imagePaths: imagePaths,
                category: selectedCategory,
                customMessage: customMessage.trim()
            });
    
            if (response.data.success) {
                setStatus('Messages sent successfully!');
                toast.success(`Messages sent to ${filteredData.length} recipients in ${selectedCategory === 'all' ? 'all categories' : `category: ${selectedCategory}`}`);
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getFilteredData = () => {
        if (selectedCategory === 'all') {
            return parsedData;
        }
        return parsedData.filter(item => item.category === selectedCategory);
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
                New Products <NewReleases />
            </div>

            <div className="drop-file">
                <FileUpload
                    ref={fileInputRef}
                    onFileUpload={handleFileUpload}
                    acceptedFiles=".xlsx"
                    storageKey="newProductsFile"
                />
            </div>

            {categories.length > 0 && (
                <div className="category-filter" style={{ margin: '20px 0' }}>
                    <label htmlFor="category-select" style={{ marginRight: '10px' }}>
                        Filter by Category:
                    </label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="textarea-container">
                <textarea
                    className="custom-textarea"
                    value={
                        getFilteredData().length > 0
                            ? getFilteredData()
                                .map(row => 
                                    `Name: ${row.name}, Phone: ${row.number}, Category: ${row.category}, Price: NPR ${row.price.toLocaleString()}, Min Quantity: ${row.minQuantity.toLocaleString()} units`
                                )
                                .join('\n')
                            : 'No data loaded'
                    }
                    readOnly
                />
            </div>
            <div className="message-container">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your custom message here. Use {name}, {category}, {price}, and {minQuantity} as placeholders."
            />
           </div>

                <div className="image-upload-container">
                    <ImageUpload
                        onImageUpload={handleImageUpload}
                        maxFiles={5}
                    />
                    <div className="selected-images">
                        {selectedImages.map((image, index) => (
                            <div key={index} className="image-preview">
                                <img src={image.preview} alt={`Preview ${index}`} />
                                <button onClick={() => removeImage(index)}>Remove</button>
                            </div>
                        ))}
                    </div>
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
            <ToastContainer />
        </div>
    );
};

export default NewProducts;