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

let client = null;
let qrCodeData = null;
let isInitializing = false;
let isClientReady = false;

// Initialize WhatsApp Client
const initializeWhatsApp = async () => {
    if (isInitializing) {
        throw new Error('WhatsApp client is already initializing');
    }

    if (client) {
        return client;
    }

    isInitializing = true;
    qrCodeData = null;

    try {
        client = new Client({
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        client.on('qr', async (qr) => {
            console.log('Received QR code event');
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
        });

        client.on('auth_failure', (msg) => {
            console.error('AUTHENTICATION FAILED:', msg);
            resetClient();
        });

        client.on('disconnected', (reason) => {
            console.log('Client was disconnected:', reason);
            resetClient();
        });

        await client.initialize();
        return client;
    } catch (error) {
        console.error('Failed to initialize client:', error);
        resetClient();
        throw error;
    } finally {
        isInitializing = false;
    }
};

// Reset WhatsApp client
const resetClient = async () => {
    if (client) {
        await client.destroy();
        client = null;
        qrCodeData = null;
        isClientReady = false;
        console.log('WhatsApp client destroyed and session ended');
    }
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

// Send product messages with images
app.post('/api/send-product-messages', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp client is not ready yet. Please scan the QR code.'
        });
    }

    const { messages, imagePaths } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid message data'
        });
    }

    try {
        const results = await Promise.all(messages.map(async (msg) => {
            const { country_code, number, name, product_name, product_price } = msg;
            const fullNumber = `${country_code}${number}@c.us`;
            
            try {
                // First send text message
                const textMessage = `Dear ${name}, we have a new product for you!\n\nProduct: ${product_name}\nPrice: NPR ${product_price}`;
                await client.sendMessage(fullNumber, textMessage);

                // Then send each image with a small delay between them
                for (const imagePath of imagePaths) {
                    const media = MessageMedia.fromFilePath(imagePath);
                    await client.sendMessage(fullNumber, media);
                    // Add a small delay between images
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                return { success: true, number: fullNumber };
            } catch (error) {
                console.error(`Failed to send message to ${fullNumber}:`, error);
                return { success: false, number: fullNumber, error: error.message };
            }
        }));

        // Clean up uploaded images after sending
        for (const imagePath of imagePaths) {
            try {
                await fs.unlink(imagePath);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }

        // Reset client after 10 seconds
        setTimeout(async () => {
            console.log("Closing WhatsApp connection after 10 seconds...");
            await resetClient();
        }, 10000);

        res.json({ success: true, results });
    } catch (error) {
        console.error('Error sending messages:', error);
        resetClient();
        res.status(500).json({ success: false, error: 'Failed to send messages' });
    }
});

// Existing endpoints
app.get('/api/generate-qr', async (req, res) => {
    console.log('QR code generation request received');
    try {
        if (!client) {
            console.log('Initializing WhatsApp client...');
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
            });
        } else {
            resetClient();
            return res.status(408).json({
                success: false,
                error: 'QR code generation timeout',
            });
        }
    } catch (error) {
        console.error('Error in QR generation:', error);
        resetClient();
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate QR code',
        });
    }
});

app.get('/api/client-status', (req, res) => {
    res.json({
        success: true,
        isReady: isClientReady
    });
});

app.post('/api/send-messages', async (req, res) => {
    if (!isClientReady) {
        return res.status(400).json({ success: false, error: 'WhatsApp client is not ready yet. Please scan the QR code.' });
    }

    if (!client || !client.info) {
        return res.status(400).json({ success: false, error: 'WhatsApp client not initialized' });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid message data' });
    }

    try {
        const results = await Promise.all(messages.map(async (msg) => {
            const { country_code, number, name, daysLate, outstandingAmount } = msg;
            const fullNumber = `${country_code}${number}@c.us`;
            const message = `Dear ${name}, this is a reminder that your payment of NPR ${outstandingAmount} is ${daysLate} days late. Please make the payment as soon as possible.`;

            const randomDelay = Math.floor(Math.random() * (30000 - 12000 + 1)) + 14000;
            await new Promise(resolve => setTimeout(resolve, randomDelay));

            try {
                await client.sendMessage(fullNumber, message);
                return { success: true, number: fullNumber };
            } catch (error) {
                console.error(`Failed to send message to ${fullNumber}:`, error);
                return { success: false, number: fullNumber, error: error.message };
            }
        }));

        setTimeout(async () => {
            console.log("Closing WhatsApp connection after 10 seconds...");
            await resetClient();
        }, 10000);

        res.json({ success: true, results });
    } catch (error) {
        console.error('Error sending messages:', error);
        resetClient();
        res.status(500).json({ success: false, error: 'Failed to send messages' });
    }
});

app.get('/api/reset', (req, res) => {
    resetClient();
    res.json({ success: true, message: 'Client reset successfully' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});