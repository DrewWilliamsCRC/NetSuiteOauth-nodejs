# NetSuite REST API Client

A Node.js client for interacting with the NetSuite REST API using OAuth 1.0a authentication.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your NetSuite credentials:
   ```
   NETSUITE_ACCOUNT=your_account_id
   NETSUITE_CONSUMER_KEY=your_consumer_key
   NETSUITE_CONSUMER_SECRET=your_consumer_secret
   NETSUITE_TOKEN_KEY=your_token_key
   NETSUITE_TOKEN_SECRET=your_token_secret
   ```

## Usage

The project includes a `NetSuiteClient` class that handles OAuth authentication and provides methods for making API requests.

### Example

```javascript
const NetSuiteClient = require('./src/NetSuiteClient');

async function main() {
    const client = new NetSuiteClient();

    try {
        // Get a list of customers
        const customers = await client.get('/record/v1/customer');
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

        const createdCustomer = await client.post('/record/v1/customer', newCustomer);
        console.log('Created Customer:', createdCustomer);

    } catch (error) {
        console.error('Error:', error.message);
    }
}
```

## Available Methods

- `get(endpoint)`: Make a GET request to the specified endpoint
- `post(endpoint, data)`: Make a POST request to the specified endpoint with the provided data

## Documentation

For more information about the NetSuite REST API, refer to the [official documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html). 