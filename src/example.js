require('dotenv').config();
const NetSuiteClient = require('./NetSuiteClient');

// Initialize client with OAuth 2.0 credentials
const client = new NetSuiteClient({
    accountId: process.env.ACCOUNT_ID,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scope: process.env.OAUTH_SCOPE // Optional
});

// Check configuration
console.log('Configuration loaded:');
console.log('- Account ID:', process.env.ACCOUNT_ID ? '✓ Set' : '❌ Missing');
console.log('- Client ID:', process.env.CLIENT_ID ? '✓ Set' : '❌ Missing');
console.log('- Client Secret:', process.env.CLIENT_SECRET ? '✓ Set' : '❌ Missing');

// Test functions
async function debugClientConfiguration() {
    console.log('\nRunning test: Debug Client Configuration');
    console.log('Debugging NetSuiteClient configuration...');
    
    console.log('Client initialized with:');
    console.log('- Base URL:', client.baseUrl);
    
    try {
        console.log('Attempting to authenticate and make a simple request...');
        const data = await client.get('/services/rest/record/v1/account');
        console.log('✅ Connection successful!');
        console.log('Response data:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
        return true;
    } catch (error) {
        console.log('Request failed but we can analyze the error:');
        console.log('Error message:', error.message);
        return false;
    }
}

async function testAccountSettings() {
    console.log('\nRunning test: Account Settings Test');
    try {
        console.log('Testing GET account settings...');
        const settings = await client.get('/services/rest/record/v1/accountsettings');
        console.log('✅ Successfully retrieved account settings');
        console.log('Account settings:', JSON.stringify(settings, null, 2).substring(0, 200) + '...');
        return true;
    } catch (error) {
        console.log('❌ Error getting account settings:', error.message);
        return false;
    }
}

async function testCurrencyEndpoint() {
    console.log('\nRunning test: Currency Endpoint Test');
    try {
        console.log('Testing GET currency endpoint...');
        const currencies = await client.get('/services/rest/record/v1/currency?limit=5');
        console.log('✅ Successfully retrieved currencies');
        console.log('Currencies:', JSON.stringify(currencies, null, 2).substring(0, 200) + '...');
        return true;
    } catch (error) {
        console.log('❌ Error getting currencies:', error.message);
        return false;
    }
}

async function testSuiteQLQuery() {
    console.log('\nRunning test: SuiteQL Query Test');
    try {
        console.log('Testing SuiteQL endpoint...');
        const query = {
            q: 'SELECT id, companyName FROM customer WHERE isInactive = false LIMIT 10'
        };
        const results = await client.post('/services/rest/query/v1/suiteql', query);
        console.log('✅ Successfully executed SuiteQL query');
        console.log('Results:', JSON.stringify(results, null, 2).substring(0, 200) + '...');
        return true;
    } catch (error) {
        console.log('❌ Error executing SuiteQL query:', error.message);
        return false;
    }
}

async function testCustomerEndpoint() {
    console.log('\nRunning test: Customer Endpoint Test');
    try {
        console.log('Testing GET customers endpoint...');
        const customers = await client.get('/services/rest/record/v1/customer?limit=10');
        console.log('✅ Successfully retrieved customers');
        console.log('Customers:', JSON.stringify(customers, null, 2).substring(0, 200) + '...');
        return true;
    } catch (error) {
        console.log('❌ Error getting customers:', error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting NetSuite API tests with OAuth 2.0...');
    
    const results = {
        debugClient: await debugClientConfiguration(),
        accountSettings: await testAccountSettings(),
        currency: await testCurrencyEndpoint(),
        suiteQL: await testSuiteQLQuery(),
        customer: await testCustomerEndpoint()
    };
    
    // Calculate totals
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(Boolean).length;
    const failed = total - passed;
    
    // Print summary
    console.log('\nTest Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
}

// Execute tests
runTests().catch(error => {
    console.error('Error during test execution:', error);
}); 