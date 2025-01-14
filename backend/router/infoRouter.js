const express = require('express');
const router = express.Router();
const Info = require('../model/Info');
const mongoose = require('mongoose');
// GET all records
router.get('/', async (req, res) => {
    try {
        const info = await Info.find(); // Fetch all records without skipping or limiting
        res.json({
            data: info, // Return all records
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single record by ID
router.get('/:id', async (req, res) => {
    try {
        const info = await Info.findById(req.params.id);
        if (!info) return res.status(404).json({ message: 'Record not found' });
        res.json(info);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CREATE new record
router.post('/', async (req, res) => {
    const info = new Info({
        "Name of Ledger": req.body["Name of Ledger"],
        "Under": req.body["Under"],
        "phone_number": req.body["phone_number"]
    });

    try {
        const newInfo = await info.save();
        res.status(201).json(newInfo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// UPDATE record
router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const updateData = {
            "Name of Ledger": req.body["Name of Ledger"],
            "Under": req.body["Under"],
            "phone_number": req.body["phone_number"]
        };

        // Add validation for required fields
        if (!updateData["Name of Ledger"] || !updateData["Under"] || !updateData["phone_number"]) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const info = await Info.findByIdAndUpdate(
            req.params.id,
            updateData,
            { 
                new: true,
                runValidators: true
            }
        );

        if (!info) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.json(info);
    } catch (error) {
        console.error('Update error:', error);
        res.status(400).json({ 
            message: error.message || 'Update failed',
            details: error.errors || error
        });
    }
});

// DELETE record
router.delete('/:id', async (req, res) => {
    try {
        const info = await Info.findByIdAndDelete(req.params.id);
        if (!info) return res.status(404).json({ message: 'Record not found' });
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SEARCH by Name of Ledger
router.get('/search/name/:name', async (req, res) => {
    try {
        const info = await Info.find({
            "Name of Ledger": { $regex: req.params.name, $options: 'i' }
        });
        res.json(info);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;