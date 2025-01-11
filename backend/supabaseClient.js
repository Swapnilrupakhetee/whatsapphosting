const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    try {
        const { data, error } = await supabase.from('under_phone_mapping').select('*').limit(1);
        if (error) {
            console.error('Connection failed:', error.message);
        } else {
            console.log('Successfully connected to Supabase!', data);
        }
    } catch (error) {
        console.error('Unexpected error:', error.message);
    }
})();
