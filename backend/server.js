const express = require('express');
const cors = require('cors');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

let client = null;
let qrCodeData = null;
let isInitializing = false;
let isClientReady = false;  // Track if the client is ready to send messages

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
      isClientReady = true;  // Set client as ready
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
    await client.destroy();  // Ensure the client is destroyed and fully disconnected
    client = null;
    qrCodeData = null;
    isClientReady = false;  // Reset client readiness
    console.log('WhatsApp client destroyed and session ended');
  }
};

// Endpoint to generate QR code
app.get('/api/generate-qr', async (req, res) => {
  console.log('QR code generation request received');
  try {
    if (!client) {
      console.log('Initializing WhatsApp client...');
      await initializeWhatsApp();
    }

    let attempts = 0;
    const maxAttempts = 30;
    const waitTime = 1000; // 1 second

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

// Check client status
app.get('/api/client-status', (req, res) => {
  res.json({
    success: true,
    isReady: isClientReady
  });
});

// Send messages endpoint
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

      // Generate random delay between 2 and 5 minutes (in milliseconds)
      const randomDelay = Math.floor(Math.random() * (30000 - 12000 + 1)) + 14000;  // 2-5 minutes

      // Wait for the random delay before sending the message
      await new Promise(resolve => setTimeout(resolve, randomDelay));

      try {
        await client.sendMessage(fullNumber, message);
        return { success: true, number: fullNumber };
      } catch (error) {
        console.error(`Failed to send message to ${fullNumber}:`, error);
        return { success: false, number: fullNumber, error: error.message };
      }
    }));

    // After sending all messages, reset the client after a 10-second delay
    setTimeout(async () => {
      console.log("Closing WhatsApp connection after 10 seconds...");
      await resetClient(); // Close the connection
    }, 10000); // 10 seconds

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error sending messages:', error);
    resetClient();  // Reset client in case of error
    res.status(500).json({ success: false, error: 'Failed to send messages' });
  }
});

// Reset the WhatsApp client
app.get('/api/reset', (req, res) => {
  resetClient();
  res.json({ success: true, message: 'Client reset successfully' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
