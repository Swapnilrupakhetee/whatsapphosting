const express = require('express');
const cors = require('cors');
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const connectDB = require('./config/db');
const app = express();
const port = 3000;
const dotenv = require('dotenv');
const infoRoutes= require('./router/infoRouter');



dotenv.config();

app.use(cors());




app.use(express.json({
    limit: '2mb' // Reduced limit since we're sending one message at a time
}));
app.use(express.urlencoded({ extended: true })); 


app.use('/api/info', infoRoutes);

app.get("/",(req,res)=>{
    res.json("Hello");
})
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

connectDB();

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

// Initialize WhatsApp client
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
        await resetClient();

        client = new Client({
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--no-first-run'
                ],
                timeout: 120000
            }
        });

        client.on('qr', async (qr) => {
            try {
                qrCodeData = await qrcode.toDataURL(qr);
            } catch (err) {
                console.error('QR Generation Error:', err);
                qrCodeData = null;
            }
        });

        client.on('ready', () => {
            isClientReady = true;
            connectionRetries = 0;
        });

        client.on('disconnected', async () => {
            isClientReady = false;
            if (connectionRetries < MAX_RETRIES) {
                connectionRetries++;
                setTimeout(async () => {
                    await resetClient();
                    await initializeWhatsApp();
                }, 5000);
            } else {
                await resetClient();
            }
        });

        await client.initialize();
        return client;
    } catch (error) {
        await resetClient();
        throw error;
    } finally {
        isInitializing = false;
    }
};

// Reset client
const resetClient = async () => {
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

// Generate QR code endpoint
app.get('/api/generate-qr', async (req, res) => {
    try {
        if (!client || !isClientReady) {
            await initializeWhatsApp();
        }

        let attempts = 0;
        const maxAttempts = 30;
        const waitTime = 1000;

        while (!qrCodeData && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempts++;
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
                error: 'QR code generation timeout'
            });
        }
    } catch (error) {
        await resetClient();
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send messages endpoint
app.post('/api/send-messages', async (req, res) => {
    if (!isClientReady) {
        await initializeWhatsAppClient();
        if (!isClientReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client initialization failed'
            });
        }
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid message data'
        });
    }

    try {
        // Filter out messages for parties marked with 'n' or 'N'
        const filteredMessages = messages.filter(msg => {
            // Check if the message contains any indication of 'n' or 'N' in the content
            const messageLines = msg.message.split('\n');
            let shouldSkip = false;
            
            // Look for any line that might contain the send message flag
            messageLines.forEach(line => {
                if (line.toLowerCase().includes('send message: n')) {
                    shouldSkip = true;
                }
            });

            return !shouldSkip;
        });

        if (filteredMessages.length === 0) {
            return res.json({
                success: true,
                message: 'No messages to send after filtering',
                results: []
            });
        }

        const results = await Promise.all(filteredMessages.map(async (msg) => {
            const { country_code, number, message } = msg;
            
            if (!number || number.length < 10) {
                return { 
                    success: false, 
                    number: `${country_code}${number}`,
                    error: 'Invalid phone number' 
                };
            }

            const fullNumber = `${country_code}${number}@c.us`;
            
            try {
                const isRegistered = await client.isRegisteredUser(fullNumber);
                if (!isRegistered) {
                    return { 
                        success: false, 
                        number: fullNumber, 
                        error: 'Number not registered on WhatsApp' 
                    };
                }

                await client.sendMessage(fullNumber, message);
                return { 
                    success: true, 
                    number: fullNumber,
                    message: 'Message sent successfully'
                };
            } catch (error) {
                return { 
                    success: false, 
                    number: fullNumber, 
                    error: error.message 
                };
            }
        }));
        setTimeout(async () => {
            await disconnectAndUnlink();
        }, 10000);
        // Add summary of filtered messages
        const summary = {
            totalMessages: messages.length,
            messagesSent: filteredMessages.length,
            messagesFiltered: messages.length - filteredMessages.length
        };

        res.json({ 
            success: true, 
            summary,
            results 
        });
    } catch (error) {
        console.error('Message sending error:', error);
        await resetClient();
        res.status(500).json({
            success: false,
            error: 'Failed to send messages: ' + error.message
        });
    }
});

// Product message sending endpoint
app.post('/api/send-product-messages', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ 
            success: false, 
            error: 'WhatsApp client is not ready',
            shouldReconnect: true
        });
    }

    const { messages, imagePaths, customMessage } = req.body;

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

                let textMessage;
                if (customMessage) {
                    textMessage = customMessage
                        .replace(/{name}/g, name)
                        .replace(/{category}/g, category)
                        .replace(/{price}/g, price.toLocaleString())
                        .replace(/{minQuantity}/g, minQuantity.toLocaleString());
                } else {
                    textMessage = `Dear ${name},\n\n` +
                        `New product in ${category}!\n` +
                        `Price: NPR ${price.toLocaleString()}\n` +
                        `Min Quantity: ${minQuantity.toLocaleString()} units\n\n` +
                        `See images below:`;
                }

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

        // Schedule disconnect after 10 seconds
        setTimeout(async () => {
            await disconnectAndUnlink();
        }, 10000);

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
        res.status(500).json({
            success: false,
            error: 'Failed to send messages',
            details: error.message
        });
    }
});

// Client status endpoint
app.get('/api/client-status', (req, res) => {
    res.json({
        success: true,
        isReady: isClientReady,
        connectionAttempts: connectionRetries
    });
});

// Reset endpoint
app.get('/api/reset', async (req, res) => {
    try {
        await resetClient();
        res.json({
            success: true,
            isReady: isClientReady
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const disconnectAndUnlink = async () => {
    if (client && isClientReady) {
        try {
            // Unlink from WhatsApp Web (removes from linked devices)
            await client.logout();
            
            // Destroy the client
            await client.destroy();
            
            // Reset all states
            client = null;
            qrCodeData = null;
            isClientReady = false;
            
            console.log('Successfully disconnected and unlinked WhatsApp client');
        } catch (error) {
            console.error('Error during disconnect and unlink:', error);
            // Attempt force reset if normal disconnect fails
            await resetClient();
        }
    }
};
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});