// supabaseTest.js
const { supabase, dbQueries, testConnection } = require('./supabaseClient');

async function testSupabaseConnection() {
    console.log('Testing Supabase connection and queries...\n');
    
    try {
        // Test 1: Basic connection test
        console.log('1. Testing basic connection...');
        const isConnected = await testConnection();
        if (!isConnected) throw new Error('Failed to connect to Supabase');
        console.log('✅ Connection successful\n');

        // Test 2: Manager phones query
        console.log('2. Testing getManagerPhones()...');
        try {
            const managerPhones = await dbQueries.getManagerPhones();
            console.log(`✅ Successfully retrieved ${managerPhones.length} manager phone mappings`);
            console.log('Sample data:', managerPhones[0] || 'No data found', '\n');
        } catch (error) {
            console.log('❌ getManagerPhones() failed:', error.message, '\n');
        }

        // Test 3: Parties query
        console.log('3. Testing getParties()...');
        try {
            const parties = await dbQueries.getParties();
            console.log(`✅ Successfully retrieved ${parties.length} party mappings`);
            console.log('Sample data:', parties[0] || 'No data found', '\n');
        } catch (error) {
            console.log('❌ getParties() failed:', error.message, '\n');
        }

        // Test 4: Pending bills query
        console.log('4. Testing getAllPendingBills()...');
        try {
            const pendingBills = await dbQueries.getAllPendingBills();
            console.log(`✅ Successfully retrieved ${pendingBills.length} pending bills`);
            console.log('Sample data:', pendingBills[0] || 'No data found', '\n');
        } catch (error) {
            console.log('❌ getAllPendingBills() failed:', error.message, '\n');
        }

        // Test 5: Notification logging
        console.log('5. Testing logNotification()...');
        try {
            const testNotification = {
                managerPhone: 'test_phone',
                partyName: 'test_party',
                message: 'Test notification',
                status: 'TEST',
            };
            await dbQueries.logNotification(testNotification);
            console.log('✅ Successfully logged test notification\n');
        } catch (error) {
            console.log('❌ logNotification() failed:', error.message, '\n');
        }

    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error('Error details:', error);
    }
}

// Run the tests
if (require.main === module) {
    testSupabaseConnection()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { testSupabaseConnection };