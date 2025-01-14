const mongoose = require('mongoose');

const InfoSchema = new mongoose.Schema({
    "Name of Ledger": {
        type: String,
        required: true
    },
    "Under": {
        type: String,
        required: true
    },
    "phone_number": {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Info', InfoSchema);
