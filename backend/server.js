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

const initializeWhatsApp = () => {
  return new Promise((resolve, reject) => {
    if (client) {
      // If client exists but we have qrCodeData, something's wrong - reset
      if (qrCodeData) {
        client.destroy();
        client = null;
      } else {
        resolve(client);
        return;
      }
    }

    client = new Client({
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    });

    // Set up event handlers
    client.on('qr', async (qr) => {
      try {
        console.log('Received QR code event');
        qrCodeData = await qrcode.toDataURL(qr);
        console.log('Successfully converted QR to data URL');
      } catch (err) {
        console.error('QR Generation Error:', err);
        qrCodeData = null;
      }
    });

    client.on('ready', () => {
      console.log('WhatsApp Client is ready!');
      qrCodeData = null;
      resolve(client);
    });

    client.on('auth_failure', (msg) => {
      console.error('AUTHENTICATION FAILED:', msg);
      qrCodeData = null;
      client = null;
      reject(new Error('WhatsApp authentication failed'));
    });

    client.on('disconnected', (reason) => {
      console.log('Client was disconnected:', reason);
      qrCodeData = null;
      client = null;
    });

    client.initialize().catch(error => {
      console.error('Failed to initialize client:', error);
      qrCodeData = null;
      client = null;
      reject(error);
    });
  });
};

app.get('/api/generate-qr', async (req, res) => {
  console.log('QR code generation request received');
  
  try {
    if (client) {
      console.log('Destroying existing client...');
      await client.destroy();
      client = null;
      qrCodeData = null;
    }

    console.log('Initializing WhatsApp client...');
    await initializeWhatsApp();
    
    console.log('Waiting for QR code...');
    let attempts = 0;
    const maxAttempts = 30; // Increased to 30 attempts
    
    while (!qrCodeData && attempts < maxAttempts) {
      console.log(`Attempt ${attempts + 1}/${maxAttempts} to get QR code`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      // If we have a QR code, send it immediately
      if (qrCodeData) {
        console.log('QR code generated successfully');
        return res.json({
          success: true,
          qrCode: qrCodeData
        });
      }
    }

    // If we get here, we timed out
    console.error('QR code generation timed out');
    res.status(500).json({
      success: false,
      error: 'QR code generation timeout'
    });
  } catch (error) {
    console.error('Error in QR generation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate QR code'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});