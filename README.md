# NetSuite REST API Browser

A containerized application for browsing and testing the NetSuite REST API with OAuth 2.0 authentication.

## Overview

This application provides a user-friendly interface to explore and interact with the NetSuite REST API. It handles OAuth 2.0 authentication and provides a modern UI for working with NetSuite data.

### Features

- OAuth 2.0 authentication with token refresh
- Browse NetSuite record types 
- View record metadata and fields
- Search and filter records
- Perform CRUD operations via the REST API
- Interactive UI for API exploration
- Modern design with responsive layout

## Setup

### Prerequisites

- Docker and Docker Compose
- NetSuite account with REST Web Services feature enabled
- OAuth 2.0 integration set up in NetSuite

### NetSuite Configuration

1. In NetSuite, go to **Setup > Company > Enable Features > SuiteCloud** and enable:
   - REST Web Services
   - Token-based Authentication

2. Go to **Setup > Integration > Manage Integrations** and create a new integration:
   - Check **Token-based Authentication**
   - Check **TBA: Authorization Flow** and select **Client Credentials**
   - Set appropriate permissions for the integration
   - Set the redirect URL to `http://localhost:3000/callback`
   - Save and copy the Client ID and Client Secret

### Application Configuration

1. Create a `.env` file in the project root with:

```
ACCOUNT_ID=your_netsuite_account_id
CLIENT_ID=your_oauth_client_id
CLIENT_SECRET=your_oauth_client_secret
REDIRECT_URI=http://localhost:3000/callback
```

## Usage

### Production Mode

To run the application in production mode:

```bash
# Build and start the container
docker-compose up -d

# Or use the npm scripts
npm run docker:build
npm run docker:start
```

The application will be available at http://localhost:3000

### Development Mode

For development with live code reloading:

```bash
# Use the development script
./dev.sh

# Or use the npm script
npm run docker:dev
```

This script will:
1. Stop any running containers
2. Build the development container
3. Start the REST API Browser with volume mounts for live code updates

## Available API Resources

The application will display the following types of resources:

- **Record Types**: Standard and custom record types
- **Record Fields**: Field definitions for each record type
- **Record Data**: Actual record instances with their field values
- **Metadata**: Information about the structure of records and fields

## Troubleshooting

If you encounter issues:

1. Check the container logs:
   ```bash
   docker-compose logs
   ```

2. Verify your NetSuite integration settings:
   - Ensure the redirect URI exactly matches what's in your .env file
   - Verify your integration is enabled in NetSuite
   - Check that the integration has the necessary permissions

3. For network issues:
   - Check that port 3000 is not in use by another application
   - Verify firewall settings

## Project Structure

```
netsuite-rest-api-browser/
├── assets/                   # Static assets and CSS
├── rest-api-browser/         # Main application code
│   ├── src/                  # Source code
│   ├── Dockerfile            # Production container
│   └── Dockerfile.dev        # Development container
├── docker-compose.yml        # Production Docker configuration
├── docker-compose.dev.yml    # Development Docker configuration
└── dev.sh                    # Development startup script
```

## License

MIT 