# NetSuite API Toolkit

A comprehensive Node.js toolkit for working with the NetSuite REST API, featuring OAuth 2.0 authentication and a visual API browser.

## Features

- OAuth 2.0 authentication with NetSuite
- API test endpoints for common record types
- Interactive REST API Browser
- Token management (viewing, refreshing, clearing)

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

## Usage

Start the application:
```bash
npm start
```

Then navigate to http://localhost:3000 in your browser to:
1. Authenticate with NetSuite using OAuth 2.0
2. Test various API endpoints
3. Explore the REST API browser

## NetSuite OAuth 2.0 Setup

Before using this client, you need to set up OAuth 2.0 in your NetSuite account:

1. Go to **Setup > Company > Enable Features > SuiteCloud** and enable **REST Web Services** and **Token-based Authentication**
2. Go to **Setup > Integration > Manage Integrations** and create a new integration:
   - Check **Token-based Authentication**
   - Check **TBA: Authorization Flow** and select **Client Credentials**
   - Set appropriate permissions for the integration
   - Save and copy the Client ID and Client Secret

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