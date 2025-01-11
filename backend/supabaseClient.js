// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check if environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple connection test function
async function testConnection() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Supabase connection error:', error.message);
        return false;
    }
}

// Database query functions
const dbQueries = {
    // Get all manager phone mappings
    async getManagerPhones() {
        const { data, error } = await supabase
            .from('under_phone_mapping')
            .select('under_value, phone_number');
        
        if (error) throw error;
        return data;
    },

    // Get all parties with their managers
    async getParties() {
        const { data, error } = await supabase
            .from('Ledgers')
            .select(`
                "Sl. No.",
                "Name of Ledger",
                "Under"
            `);
        
        if (error) throw error;
        return data;
    },

    // Get parties under a specific manager
    async getPartiesByManager(underValue) {
        const { data, error } = await supabase
            .from('Ledgers')
            .select(`
                "Sl. No.",
                "Name of Ledger",
                "Under"
            `)
            .eq('Under', underValue);
        
        if (error) throw error;
        return data;
    },

    // Get all pending bills with party and manager details
    async getAllPendingBills() {
        // First get all parties and their managers
        const { data: ledgers, error: ledgersError } = await supabase
            .from('Ledgers')
            .select(`
                "Name of Ledger",
                "Under"
            `);
        
        if (ledgersError) throw ledgersError;

        // Then get all manager phone numbers
        const { data: phoneMapping, error: phoneError } = await supabase
            .from('under_phone_mapping')
            .select('*');
        
        if (phoneError) throw phoneError;

        // Create a mapping of under_value to phone_number
        const phoneMap = phoneMapping.reduce((acc, curr) => {
            acc[curr.under_value] = curr.phone_number;
            return acc;
        }, {});

        // Combine the data
        return ledgers.map(ledger => ({
            partyName: ledger['Name of Ledger'],
            managerName: ledger['Under'],
            managerPhone: phoneMap[ledger['Under']] || 'No phone number'
        }));
    },

    // Log notification history
    async logNotification(notification) {
        // Create notification_logs table if it doesn't exist
        const { error: createTableError } = await supabase.rpc('create_notification_logs_if_not_exists');
        
        if (createTableError) {
            console.error('Error creating notification_logs table:', createTableError);
            // Continue anyway as the table might already exist
        }

        const { data, error } = await supabase
            .from('notification_logs')
            .insert([{
                manager_phone: notification.managerPhone,
                party_name: notification.partyName,
                message_content: notification.message,
                status: notification.status,
                error: notification.error || null,
                sent_at: new Date()
            }]);
        
        if (error) throw error;
        return data;
    }
};

module.exports = { supabase, dbQueries, testConnection };