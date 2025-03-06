# NetSuite REST API Browser

A web application for browsing and exploring the NetSuite REST API endpoints. This application uses OAuth 2.0 for authentication with NetSuite.

## Features

- OAuth 2.0 authentication with NetSuite
- Browse available REST API resources using metadata
- View detailed information about each resource
- Test API endpoints directly from the browser
- View response data in a formatted manner

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
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```
2. Open a browser and navigate to `http://localhost:3000`
3. Click the "Authorize with NetSuite" button to begin the OAuth flow
4. Once authorized, you can browse the available REST API endpoints

## API Resources

The application will display the following types of resources:

- **Records API**: Standard and custom record types
- **Query API**: Endpoints for searching and querying records
- **REST Schema**: Detailed schema information for all resources
- **Metadata**: Information about the structure of records and fields

## Notes

- This application uses the NetSuite Metadata API to dynamically discover available resources
- Access to specific resources depends on the permissions of the authenticated user
- Some resources may not be available depending on your NetSuite account configuration 