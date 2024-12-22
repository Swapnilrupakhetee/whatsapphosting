require("dotenv").config();
const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

// Read payment data from JSON file
const paymentData = JSON.parse(fs.readFileSync("payment-details.json", "utf8"));

// Configure the client to always start fresh
const client = new Client({
  session: null, // Force new login each time
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Generate QR code for scanning
client.on("qr", (qr) => {
  console.log("QR REQUIRED - PLEASE SCAN");
  qrcode.generate(qr, { small: true });
});

// Authentication success
client.on("authenticated", (session) => {
  console.log("AUTHENTICATION SUCCESSFUL");
});

// Authentication failure
client.on("auth_failure", (msg) => {
  console.error("AUTHENTICATION FAILURE", msg);
  process.exit(1);
});

// Function to generate random delay between 30-60 seconds
// Function to generate random delay between 2-5 minutes
function getRandomDelay() {
  return Math.floor(Math.random() * (30000 - 12000 + 1)) + 12000; // 120,000 ms = 2 minutes, 300,000 ms = 5 minutes
}

// Client is ready
client.on("ready", async () => {
  console.log("CLIENT CONNECTED - SENDING MESSAGES");

  try {
    // Use Promise.all to send messages concurrently
    const messagePromises = paymentData.map(async (recipient) => {
      const chatId = `${recipient.country_code}${recipient.number}@c.us`;

      // Compose personalized message
      const msg = `Dear Customer,\n\nThis is a payment reminder. Your payment is ${recipient.daysLate} days overdue. 
Please settle the outstanding amount of NPR ${recipient.outstandingAmount} at your earliest convenience.\n\nThank you.`;

      // Get random delay
      const delay = getRandomDelay();
      console.log(
        `Waiting ${delay / 1000} seconds before sending message to ${
          recipient.number
        }`
      );

      // Wait for the delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        // Send message
        const response = await client.sendMessage(chatId, msg);
        console.log(`Message sent successfully to ${recipient.number}!`);
        console.log("Message ID:", response.id.id);
        return response;
      } catch (error) {
        console.error(`Error sending message to ${recipient.number}:`, error);
        throw error;
      }
    });

    // Wait for all messages to be sent
    await Promise.all(messagePromises);

    console.log("ALL MESSAGES SENT SUCCESSFULLY");

    // Schedule connection cleanup after 1 minute
    setTimeout(async () => {
      try {
        console.log("INITIATING LOGOUT AND CONNECTION CLOSE...");
        await client.logout();
        console.log("LOGGED OUT OF WHATSAPP");
      } catch (logoutError) {
        console.error("Error during logout:", logoutError);
      }

      // Destroy client connection
      client.destroy();
      console.log("CLIENT CONNECTION CLOSED");
      process.exit(0); // Exit process after cleanup
    }, 60000); // 1 minute delay (60,000 ms)
  } catch (error) {
    console.error("Error in sending messages:", error);
    process.exit(1);
  }
});

// Initialize the client
client.initialize();
