# NetSuite API Toolkit

A comprehensive Node.js toolkit for working with the NetSuite REST API, featuring OAuth 2.0 authentication and a visual API browser.

## Features

- OAuth 2.0 authentication with NetSuite
- API test endpoints for common record types
- Interactive REST API Browser
- Token management (viewing, refreshing, clearing)
- Multiple packaging options for easy distribution and use

## Installation Options

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/DrewWilliamsCRC/netsuite-api-toolkit.git
cd netsuite-api-toolkit

# Install dependencies
npm install

# Create and configure .env file
cp .env.example .env
# Edit .env with your NetSuite credentials

# Start the application
npm start
```

### Option 2: Install as Global NPM Package

```bash
# Install globally directly from GitHub
npm install -g github:DrewWilliamsCRC/netsuite-api-toolkit

# Or if you've cloned the repository:
cd netsuite-api-toolkit
npm install -g .

# Create and configure .env file in your working directory
cp /path/to/node_modules/netsuite-api-toolkit/.env.example .env
# Edit .env with your NetSuite credentials

# Run from anywhere
netsuite-api-toolkit
```

### Option 3: Run Using Docker

```bash
# Pull from Docker Hub
docker pull drewwilliamscrc/netsuite-api-toolkit

# Or build locally
docker build -t netsuite-api-toolkit .

# Run the container with environment variables
docker run -p 3000:3000 \
  -e ACCOUNT_ID=your_account_id \
  -e CLIENT_ID=your_client_id \
  -e CLIENT_SECRET=your_client_secret \
  netsuite-api-toolkit
```

### Option 4: Download Standalone Executable

```bash
# Download the appropriate executable for your OS from:
# https://github.com/DrewWilliamsCRC/netsuite-api-toolkit/releases

# Make it executable (Linux/macOS)
chmod +x netsuite-api-toolkit-macos

# Create and configure .env file in the same directory
cp .env.example .env
# Edit .env with your NetSuite credentials

# Run the executable
./netsuite-api-toolkit-macos
```

## NetSuite OAuth 2.0 Setup

Before using this client, you need to set up OAuth 2.0 in your NetSuite account:

1. Go to **Setup > Company > Enable Features > SuiteCloud** and enable **REST Web Services** and **Token-based Authentication**
2. Go to **Setup > Integration > Manage Integrations** and create a new integration:
   - Check **Token-based Authentication**
   - Check **TBA: Authorization Flow** and select **Client Credentials**
   - Set appropriate permissions for the integration
   - Save and copy the Client ID and Client Secret

## Configuration

Create a `.env` file in the root directory with your NetSuite OAuth 2.0 credentials:

```
ACCOUNT_ID=your_account_id
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
OAUTH_SCOPE=optional_scope_value
PORT=3000 # Optional, defaults to 3000
```

## Usage

After starting the application, navigate to http://localhost:3000 in your browser to:

1. Authenticate with NetSuite using OAuth 2.0
2. Explore the REST API browser
3. Manage your authentication tokens

## REST API Browser Features

The REST API Browser allows you to:

- Browse all available NetSuite REST API endpoints
- View endpoint documentation
- Construct and send requests with custom parameters
- View formatted JSON responses
- Copy request URLs and response data

## Available API Methods

- `authenticate()`: Get a new OAuth 2.0 access token
- `getValidToken()`: Get a valid token (automatically refreshes if expired)
- `getAuthHeader()`: Get the authorization header for API requests
- `get(endpoint)`: Make a GET request to the specified endpoint
- `post(endpoint, data)`: Make a POST request to the specified endpoint with the provided data

## Building from Source

To build the standalone executables:

```bash
# Install dependencies
npm install

# Build for all platforms
npm run build

# Executables will be in the dist/ directory
```

## Documentation

For more information about the NetSuite REST API and OAuth 2.0, refer to:
- [NetSuite REST Web Services](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html)
- [OAuth 2.0 Authentication for NetSuite](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_162686838198.html) 

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 