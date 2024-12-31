const express = require('express');
const cors = require('cors');
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// State management
let client = null;
let qrCodeData = null;
let isInitializing = false;
let isClientReady = false;
let connectionRetries = 0;
const MAX_RETRIES = 3;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = 'uploads';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Enhanced initialization with retry mechanism
const initializeWhatsApp = async () => {
    if (isInitializing) {
        throw new Error('WhatsApp client is already initializing');
    }

    if (client && isClientReady) {
        return client;
    }

    isInitializing = true;
    qrCodeData = null;

    try {
        // Destroy existing client if any
        await resetClient();

        client = new Client({
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process'
                ],
                timeout: 120000, // 2 minute timeout
                defaultViewport: null
            },
            qrMaxRetries: 3,
            authTimeoutMs: 60000, // 1 minute auth timeout
            restartOnAuthFail: true
        });

        // Enhanced event handlers with connection management
        client.on('qr', async (qr) => {
            console.log('New QR code received');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
                console.log('QR code generated successfully');
            } catch (err) {
                console.error('QR Generation Error:', err);
                qrCodeData = null;
            }
        });

        client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            isClientReady = true;
            connectionRetries = 0;
        });

        client.on('auth_failure', async (msg) => {
            console.error('Authentication failed:', msg);
            isClientReady = false;
            if (connectionRetries < MAX_RETRIES) {
                connectionRetries++;
                console.log(`Retrying connection (${connectionRetries}/${MAX_RETRIES})`);
                await resetClient();
                await initializeWhatsApp();
            } else {
                console.error('Max retries reached. Please scan QR code again.');
                await resetClient();
            }
        });

        client.on('disconnected', async (reason) => {
            console.log('Client disconnected:', reason);
            isClientReady = false;
            if (connectionRetries < MAX_RETRIES) {
                connectionRetries++;
                console.log(`Attempting reconnection (${connectionRetries}/${MAX_RETRIES})`);
                setTimeout(async () => {
                    await resetClient();
                    await initializeWhatsApp();
                }, 5000); // Wait 5 seconds before reconnecting
            } else {
                console.error('Max reconnection attempts reached');
                await resetClient();
            }
        });

        await client.initialize();
        console.log('Client initialization completed');
        return client;
    } catch (error) {
        console.error('Failed to initialize client:', error);
        await resetClient();
        throw error;
    } finally {
        isInitializing = false;
    }
};

// Enhanced reset function with proper cleanup
const resetClient = async () => {
    console.log('Resetting WhatsApp client...');
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.error('Error destroying client:', error);
        }
    }
    client = null;
    qrCodeData = null;
    isClientReady = false;
    console.log('WhatsApp client reset completed');
};

// Handle image uploads
app.post('/api/upload-images', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No images uploaded'
            });
        }

        const imagePaths = req.files.map(file => file.path);
        res.json({
            success: true,
            imagePaths: imagePaths
        });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload images'
        });
    }
});

// Enhanced QR generation endpoint with better error handling
app.get('/api/generate-qr', async (req, res) => {
    console.log('QR code generation request received');
    try {
        if (!client || !isClientReady) {
            console.log('Initializing new WhatsApp client...');
            await initializeWhatsApp();
        }

        let attempts = 0;
        const maxAttempts = 30;
        const waitTime = 1000;

        while (!qrCodeData && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempts++;
            console.log(`Waiting for QR code... Attempt ${attempts}/${maxAttempts}`);
        }

        if (qrCodeData) {
            return res.json({
                success: true,
                qrCode: qrCodeData,
                isReady: isClientReady
            });
        } else {
            await resetClient();
            return res.status(408).json({
                success: false,
                error: 'QR code generation timeout. Please try again.',
            });
        }
    } catch (error) {
        console.error('Error in QR generation:', error);
        await resetClient();
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate QR code',
        });
    }
});

// Enhanced client status endpoint
app.get('/api/client-status', (req, res) => {
    res.json({
        success: true,
        isReady: isClientReady,
        connectionAttempts: connectionRetries
    });
});
app.post('/api/send-messages', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready yet. Please scan the QR code.'
        });
    }

    if (!client || !client.info) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client not initialized'
        });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid message data'
        });
    }

    try {
        const results = await Promise.all(
            messages.map(async (msg) => {
                const { country_code, number, name, daysLate, outstandingAmount } = msg;
                const fullNumber = `${country_code}${number}@c.us`;
                
                // Customize message format for payment reminder
             // Customize message format for payment reminder
const message = `Dear ${name},\n\n` +
`This is a reminder regarding the following pending payments:\n\n` +
`${msg.detailedContent}\n` +
`Total Outstanding Amount: NPR ${outstandingAmount}\n\n` +
`Please arrange the payment as soon as possible to avoid any inconvenience.\n\n` +
`Thank you for your cooperation.`;
                // Add random delay between messages (12-30 seconds)
                const randomDelay = Math.floor(Math.random() * (30000 - 12000 + 1)) + 12000;
                await new Promise(resolve => setTimeout(resolve, randomDelay));

                try {
                    await client.sendMessage(fullNumber, message);
                    return {
                        success: true,
                        number: fullNumber
                    };
                } catch (error) {
                    console.error(`Failed to send message to ${fullNumber}:`, error);
                    return {
                        success: false,
                        number: fullNumber,
                        error: error.message
                    };
                }
            })
        );

        // Schedule client reset after messages are sent
        setTimeout(async () => {
            console.log("Closing WhatsApp connection after 10 seconds...");
            await resetClient();
        }, 10000);

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error sending messages:', error);
        await resetClient();
        res.status(500).json({
            success: false,
            error: 'Failed to send messages'
        });
    }
});


// Enhanced product message sending endpoint
app.post('/api/send-product-messages', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ 
            success: false, 
            error: 'WhatsApp client is not ready',
            shouldReconnect: true
        });
    }

    const { messages, imagePaths } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid message data' });
    }

    try {
        const results = await Promise.all(messages.map(async (msg) => {
            const { number, countryCode, category, name, price, minQuantity } = msg;
            
            if (!number || !category || !name) {
                return {
                    success: false,
                    error: 'Missing required fields',
                    name: name || 'Unknown'
                };
            }

            const whatsappId = `${countryCode}${number}@c.us`;

            try {
                const isRegistered = await client.isRegisteredUser(whatsappId);
                if (!isRegistered) {
                    return {
                        success: false,
                        error: 'Number not registered on WhatsApp',
                        number: number,
                        name: name
                    };
                }

                const textMessage = `Dear ${name},\n\n` +
                    `New product in ${category}!\n` +
                    `Price: NPR ${price.toLocaleString()}\n` +
                    `Min Quantity: ${minQuantity.toLocaleString()} units\n\n` +
                    `See images below:`;

                await client.sendMessage(whatsappId, textMessage);

                if (Array.isArray(imagePaths) && imagePaths.length > 0) {
                    for (const imagePath of imagePaths) {
                        try {
                            await fs.access(imagePath);
                            const media = MessageMedia.fromFilePath(imagePath);
                            await client.sendMessage(whatsappId, media);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (imageError) {
                            console.error(`Failed to send image to ${whatsappId}:`, imageError);
                        }
                    }
                }

                return {
                    success: true,
                    number: number,
                    name: name
                };

            } catch (error) {
                console.error(`Failed to send message to ${whatsappId}:`, error);
                return {
                    success: false,
                    error: error.message,
                    number: number,
                    name: name
                };
            }
        }));

        // Clean up images after sending
        if (Array.isArray(imagePaths)) {
            for (const imagePath of imagePaths) {
                try {
                    await fs.unlink(imagePath);
                } catch (error) {
                    console.error(`Failed to delete image ${imagePath}:`, error);
                }
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({
            success: true,
            summary: {
                total: results.length,
                successful,
                failed
            },
            results
        });

    } catch (error) {
        console.error('Error in send-product-messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send messages',
            details: error.message
        });
    }
});


// Enhanced reset endpoint
app.get('/api/reset', async (req, res) => {
    try {
        await resetClient();
        res.json({ 
            success: true, 
            message: 'Client reset successfully',
            isReady: isClientReady
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset client',
            details: error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});