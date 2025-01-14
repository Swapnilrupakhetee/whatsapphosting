const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Import the model
const Info = require('./model/Info');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('./info.json', 'utf-8'));

// Wrap everything in a main async function
const main = async () => {
    try {
        // Connect with explicit options and await the connection
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
            connectTimeoutMS: 30000
        });
        console.log('MongoDB connected successfully');

        // Import the data
        await Info.insertMany(jsonData);
        console.log('Data imported successfully');

        // Close connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        // Try to close connection if it exists
        if (mongoose.connection) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// Run the main function
main();

// Add error handlers for uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});