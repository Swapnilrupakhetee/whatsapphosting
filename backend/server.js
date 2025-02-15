const express = require("express");
const cors = require("cors");
const { Client, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const connectDB = require("./config/db");
const app = express();
const port = process.env.PORT || 3000;
const puppeteer = require("puppeteer");
const dotenv = require("dotenv");
const infoRoutes = require("./router/infoRouter");

let browser = null;
let client = null;
let isClientReady = false;
let isInitializing = false;
let qrCodeData = null;
let connectionRetries = 0;

dotenv.config();

app.use(
  cors({
    origin: true, // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

// Add better error handling for MongoDB connection
connectDB().catch((err) => {
  console.error("MongoDB connection error:", err);
});

app.use(
  express.json({
    limit: "2mb", // Reduced limit since we're sending one message at a time
  })
);
app.use(express.urlencoded({ extended: true }));

app.use("/api/info", infoRoutes);

app.get("/", (req, res) => {
  res.json("Hello");
});
// State management

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = "uploads";
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

connectDB();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

const initializeWhatsAppOnStartup = async () => {
    try {
        console.log('Initializing WhatsApp client on startup...');
        await initializeWhatsApp();
        console.log('WhatsApp client initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize WhatsApp client on startup:', error);
    }
};
initializeWhatsAppOnStartup();

// Initialize WhatsApp client
const initializeWhatsApp = async () => {
    console.log('Starting WhatsApp initialization...');
    if (isInitializing) {
        console.log('Already initializing...');
        throw new Error("WhatsApp client is already initializing");
    }
    if (client && isClientReady) {
        console.log('Client already ready');
        return client;
    }
    isInitializing = true;
    qrCodeData = null;
    try {
        // Launch browser separately
        console.log('Launching browser...');
        const browserOptions = {
            headless: process.env.NODE_ENV === 'production' ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            },
            executablePath: process.env.NODE_ENV === 'production' 
                ? process.env.PUPPETEER_EXECUTABLE_PATH 
                : puppeteer.executablePath()
        };
        browser = await puppeteer.launch(browserOptions);
        console.log('Browser launched successfully');

        console.log('Creating new WhatsApp client...');
        client = new Client({
            puppeteer: {
                browserWSEndpoint: browser.wsEndpoint(),
                args: browserOptions.args,
                defaultViewport: browserOptions.defaultViewport
            },
            authStrategy: new LocalAuth({ dataPath: './sessions' }),
            qrMaxRetries: 3,
            authTimeoutMs: 240000, // Increased timeout to 4 minutes
            restartOnAuthFail: true
        });

        client.on("qr", async (qr) => {
            console.log('QR Code received');
            try {
                qrCodeData = await qrcode.toDataURL(qr);
                console.log('QR Code URL generated');
            } catch (err) {
                console.error('QR Generation Error:', err);
                qrCodeData = null;
            }
        });

        client.on("ready", () => {
            console.log('WhatsApp client is ready');
            isClientReady = true;
            connectionRetries = 0;
        });

        client.on("auth_failure", async (err) => {
            console.error('Auth failure:', err);
            isClientReady = false;
            await resetClient();
        });

        client.on("disconnected", async (reason) => {
            console.log('Client disconnected:', reason);
            isClientReady = false;
            if (browser) {
                try {
                    await browser.close();
                } catch (err) {
                    console.error('Error closing browser:', err);
                }
                browser = null;
            }
            await resetClient();
        });

        console.log('Initializing client...');
        await client.initialize();
        return client;
    } catch (error) {
        console.error('WhatsApp initialization error:', error);
        if (browser) {
            try {
                await browser.close();
            } catch (err) {
                console.error('Error closing browser:', err);
            }
            browser = null;
        }
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
      console.error("Error destroying client:", error);
    }
  }
  client = null;
  qrCodeData = null;
  isClientReady = false;
};

// Handle image uploads
app.post("/api/upload-images", upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No images uploaded",
      });
    }

    const imagePaths = req.files.map((file) => file.path);
    res.json({
      success: true,
      imagePaths: imagePaths,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload images",
    });
  }
});

// Generate QR code endpoint
app.get('/api/generate-qr', async (req, res) => {
    console.log('QR code generation requested');
    try {
        if (!client || !isClientReady) {
            console.log('Initializing new WhatsApp client...');
            try {
                await initializeWhatsApp();
            } catch (initError) {
                console.error('Failed to initialize WhatsApp:', initError);
                return res.status(500).json({
                    success: false,
                    error: 'WhatsApp initialization failed',
                    details: process.env.NODE_ENV === 'development' ? {
                        stack: initError.stack,
                        puppeteerError: initError.message.includes('puppeteer')
                    } : undefined
                });
            }
        }

        let attempts = 0;
        const maxAttempts = 30;
        const waitTime = 100000;

        while (!qrCodeData && attempts < maxAttempts) {
            console.log(`Waiting for QR code... Attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            attempts++;
        }

        if (qrCodeData) {
            console.log('QR code generated successfully');
            return res.json({
                success: true,
                qrCode: qrCodeData,
                isReady: isClientReady
            });
        } else {
            console.log('QR code generation timed out');
            await resetClient();
            return res.status(408).json({
                success: false,
                error: 'QR code generation timeout'
            });
        }
    } catch (error) {
        console.error('Error in generate-qr endpoint:', error);
        await resetClient();
        return res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                puppeteerError: error.message.includes('puppeteer')
            } : undefined
        });
    }
});
// Send messages endpoint
app.post("/api/send-messages", async (req, res) => {
  if (!isClientReady) {
    await initializeWhatsAppClient();
    if (!isClientReady) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp client initialization failed",
      });
    }
  }

  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid message data",
    });
  }

  try {
    // Filter out messages for parties marked with 'n' or 'N'
    const filteredMessages = messages.filter((msg) => {
      // Check if the message contains any indication of 'n' or 'N' in the content
      const messageLines = msg.message.split("\n");
      let shouldSkip = false;

      // Look for any line that might contain the send message flag
      messageLines.forEach((line) => {
        if (line.toLowerCase().includes("send message: n")) {
          shouldSkip = true;
        }
      });

      return !shouldSkip;
    });

    if (filteredMessages.length === 0) {
      return res.json({
        success: true,
        message: "No messages to send after filtering",
        results: [],
      });
    }

    const results = await Promise.all(
      filteredMessages.map(async (msg) => {
        const { country_code, number, message } = msg;

        if (!number || number.length < 10) {
          return {
            success: false,
            number: `${country_code}${number}`,
            error: "Invalid phone number",
          };
        }

        const fullNumber = `${country_code}${number}@c.us`;

        try {
          const isRegistered = await client.isRegisteredUser(fullNumber);
          if (!isRegistered) {
            return {
              success: false,
              number: fullNumber,
              error: "Number not registered on WhatsApp",
            };
          }

          await client.sendMessage(fullNumber, message);
          return {
            success: true,
            number: fullNumber,
            message: "Message sent successfully",
          };
        } catch (error) {
          return {
            success: false,
            number: fullNumber,
            error: error.message,
          };
        }
      })
    );
    setTimeout(async () => {
      await disconnectAndUnlink();
    }, 10000);
    // Add summary of filtered messages
    const summary = {
      totalMessages: messages.length,
      messagesSent: filteredMessages.length,
      messagesFiltered: messages.length - filteredMessages.length,
    };

    res.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Message sending error:", error);
    await resetClient();
    res.status(500).json({
      success: false,
      error: "Failed to send messages: " + error.message,
    });
  }
});

// Product message sending endpoint
app.post("/api/send-product-messages", async (req, res) => {
  if (!isClientReady) {
    console.error("WhatsApp client is not ready");
    return res.status(400).json({
      success: false,
      error: "WhatsApp client is not ready",
      shouldReconnect: true,
    });
  }

  const { messages, imagePaths, customMessage } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    console.error("Invalid message data received");
    return res
      .status(400)
      .json({ success: false, error: "Invalid message data" });
  }

  console.log("Starting to send messages...");
  try {
    const results = await Promise.all(
      messages.map(async (msg) => {
        const { number, countryCode, category, name, price, minQuantity } = msg;

        if (!number || !category || !name) {
          console.error("Missing required fields for message:", msg);
          return {
            success: false,
            error: "Missing required fields",
            name: name || "Unknown",
          };
        }

        const whatsappId = `${countryCode}${number}@c.us`;
        console.log(`Processing message for ${whatsappId}`);

        try {
          const isRegistered = await client.isRegisteredUser(whatsappId);
          if (!isRegistered) {
            console.error(`Number ${whatsappId} is not registered on WhatsApp`);
            return {
              success: false,
              error: "Number not registered on WhatsApp",
              number: number,
              name: name,
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
            textMessage =
              `Dear ${name},\n\n` +
              `New product in ${category}!\n` +
              `Price: NPR ${price.toLocaleString()}\n` +
              `Min Quantity: ${minQuantity.toLocaleString()} units\n\n` +
              `See images below:`;
          }

          console.log(`Sending message to ${whatsappId}:`, textMessage);
          await client.sendMessage(whatsappId, textMessage);

          if (Array.isArray(imagePaths) && imagePaths.length > 0) {
            for (const imagePath of imagePaths) {
              try {
                await fs.access(imagePath);
                const media = MessageMedia.fromFilePath(imagePath);
                console.log(`Sending image to ${whatsappId}:`, imagePath);
                await client.sendMessage(whatsappId, media);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } catch (imageError) {
                console.error(
                  `Failed to send image to ${whatsappId}:`,
                  imageError
                );
              }
            }
          }

          return {
            success: true,
            number: number,
            name: name,
          };
        } catch (error) {
          console.error(`Failed to send message to ${whatsappId}:`, error);
          return {
            success: false,
            error: error.message,
            number: number,
            name: name,
          };
        }
      })
    );

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

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Message sending summary: ${successful} successful, ${failed} failed`
    );
    res.json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("Error in send-product-messages endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send messages",
      details: error.message,
    });
  }
});

// Client status endpoint
app.get("/api/client-status", (req, res) => {
  res.json({
    success: true,
    isReady: isClientReady,
    connectionAttempts: connectionRetries,
  });
});

// Reset endpoint
app.get("/api/reset", async (req, res) => {
  try {
    await resetClient();
    res.json({
      success: true,
      isReady: isClientReady,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
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

      console.log("Successfully disconnected and unlinked WhatsApp client");
    } catch (error) {
      console.error("Error during disconnect and unlink:", error);
      // Attempt force reset if normal disconnect fails
      await resetClient();
    }
  }
};
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    clientStatus: {
      exists: !!client,
      isReady: isClientReady,
      isInitializing,
      retries: connectionRetries,
    },
  });
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
