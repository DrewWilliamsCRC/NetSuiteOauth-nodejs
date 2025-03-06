# NetSuite REST API Client with OAuth 2.0

A Node.js client for interacting with the NetSuite REST API using OAuth 2.0 authentication with the Client Credentials grant type.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your NetSuite OAuth 2.0 credentials:
   ```
   ACCOUNT_ID=your_account_id
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   OAUTH_SCOPE=optional_scope_value
   ```

## NetSuite OAuth 2.0 Setup

Before using this client, you need to set up OAuth 2.0 in your NetSuite account:

1. Go to **Setup > Company > Enable Features > SuiteCloud** and enable **REST Web Services** and **Token-based Authentication**
2. Go to **Setup > Integration > Manage Integrations** and create a new integration:
   - Check **Token-based Authentication**
   - Check **TBA: Authorization Flow** and select **Client Credentials**
   - Set appropriate permissions for the integration
   - Save and copy the Client ID and Client Secret

## Usage

The project includes a `NetSuiteClient` class that handles OAuth 2.0 authentication and provides methods for making API requests.

### Example

```javascript
const NetSuiteClient = require('./src/NetSuiteClient');

async function main() {
    const client = new NetSuiteClient({
        accountId: process.env.ACCOUNT_ID,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scope: process.env.OAUTH_SCOPE // Optional
    });

    try {
        // Get a list of customers
        const customers = await client.get('/services/rest/record/v1/customer');
        console.log('Customers:', customers);

        // Create a new customer
        const newCustomer = {
            companyName: 'Test Company',
            email: 'test@example.com',
            subsidiary: {
                id: '1',
                refName: 'Parent Company'
            }
        };

        const createdCustomer = await client.post('/services/rest/record/v1/customer', newCustomer);
        console.log('Created Customer:', createdCustomer);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
```

## Testing

To test your OAuth 2.0 implementation, run:

```bash
node src/test-oauth.js
```

This will perform several tests:
1. Check environment variables
2. Test authentication
3. Test token refresh logic
4. Test authorization header format
5. Test a simple API call

## Available Methods

- `authenticate()`: Get a new OAuth 2.0 access token
- `getValidToken()`: Get a valid token (automatically refreshes if expired)
- `getAuthHeader()`: Get the authorization header for API requests
- `get(endpoint)`: Make a GET request to the specified endpoint
- `post(endpoint, data)`: Make a POST request to the specified endpoint with the provided data

## Documentation

For more information about the NetSuite REST API and OAuth 2.0, refer to:
- [NetSuite REST Web Services](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html)
- [OAuth 2.0 Authentication for NetSuite](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162686838198.html) 