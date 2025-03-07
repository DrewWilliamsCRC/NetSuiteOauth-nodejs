require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const NetSuiteOAuth = require('./netsuite-oauth');

// Create an Express router instead of an app
const router = express.Router();

// Export a function that initializes the router with the netsuiteClient
module.exports = function(netsuiteClient) {
  // If no client is provided, use our own (for standalone mode)
  if (!netsuiteClient) {
    // Validate required environment variables for standalone mode
    const requiredEnvVars = ['ACCOUNT_ID', 'CLIENT_ID', 'CLIENT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      console.error('Please create a .env file with these variables.');
      process.exit(1);
    }

    // For standalone mode, create a new client
    const PORT = process.env.PORT || 3000;
    const redirectUri = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;

    netsuiteClient = new NetSuiteOAuth({
      accountId: process.env.ACCOUNT_ID,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      redirectUri: redirectUri
    });
  } else {
    // Log that we're using an external client
    console.log('Using provided NetSuite OAuth client');
  }

  // Store state for CSRF protection
  let authState = null;

  // Embed the CSS directly in each page to avoid path issues
  const commonCSS = `
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px; }
    .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; }
    .button-fields { display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold; }
    .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; }
    .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
    .tab button:hover { background-color: #ddd; }
    .tab button.active { background-color: #ccc; }
    .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; }
    .paginate { margin: 20px 0; }
    .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .sidebar { width: 250px; float: left; background: #f8f9fa; height: 100%; padding: 15px; border-radius: 4px; }
    .content { margin-left: 280px; }
    .main-container { display: flex; }
    .resource-list { list-style-type: none; padding: 0; }
    .resource-list li { margin: 5px 0; }
    .resource-list a { text-decoration: none; color: #0078d7; }
    .resource-list a:hover { text-decoration: underline; }
    .api-section { margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .search-box { padding: 10px; margin: 20px 0; width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; }
    .badge { display: inline-block; padding: 3px 7px; font-size: 12px; font-weight: bold; color: white; border-radius: 10px; margin-right: 5px; }
    .badge-required { background-color: #dc3545; }
    .badge-readonly { background-color: #6c757d; }
  `;

  // Home page with link to start OAuth flow
  router.get('/', (req, res) => {
    // Generate authorization URL
    const auth = netsuiteClient.getAuthorizationUrl();
    authState = auth.state;
    
    // Get token status
    const hasToken = netsuiteClient.accessToken !== null;
    const tokenValid = netsuiteClient.isTokenValid();
    
    // Get the current timezone from the system
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Current system timezone: ${timezone}`);
    
    const tokenExpiry = netsuiteClient.tokenExpiry ? 
      new Date(netsuiteClient.tokenExpiry).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short'
      }) : 'N/A';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NetSuite REST API Browser</title>
        <style>${commonCSS}</style>
      </head>
      <body>
        <h1>NetSuite REST API Browser</h1>
        <p>Explore and test the NetSuite REST API endpoints with OAuth 2.0 authentication.</p>
        
        <div class="token-status">
          <h2>Token Status</h2>
          ${hasToken ? `
            <div class="card ${tokenValid ? 'success' : 'warning'}">
              <h3>${tokenValid ? '✅ Valid Token Available' : '⚠️ Token Expired'}</h3>
              <p><strong>Access Token:</strong> ${netsuiteClient.accessToken.substring(0, 15)}...[truncated]</p>
              <p><strong>Expires:</strong> ${tokenExpiry}</p>
              <p><strong>Status:</strong> ${tokenValid ? 'Valid' : 'Expired or expiring soon'}</p>
              <div class="flex gap-2">
                <a href="token/info" class="button">View Token Details</a>
                <a href="token/refresh" class="button">Refresh Token</a>
                <a href="token/clear" class="button button-danger" onclick="return confirm('Are you sure you want to delete this token?')">Delete Token</a>
              </div>
            </div>
            
            <div class="main-container">
              <div class="sidebar">
                <h3>API Resources</h3>
                <div class="api-section">
                  <h4>Metadata</h4>
                  <ul class="resource-list">
                    <li><a href="/api/metadata/info">API Information</a></li>
                  </ul>
                </div>
                
                <div class="api-section">
                  <h4>Record Types</h4>
                  <ul class="resource-list">
                    <li><a href="/api/records/types">All Record Types</a></li>
                  </ul>
                </div>
                
                <div class="api-section">
                  <h4>Sample Endpoints</h4>
                  <ul class="resource-list">
                    <li><a href="/api/records/account">Accounts</a></li>
                    <li><a href="/api/records/customer">Customers</a></li>
                    <li><a href="/api/records/employee">Employees</a></li>
                    <li><a href="/api/records/salesOrder">Sales Orders</a></li>
                    <li><a href="/api/records/currency">Currency</a></li>
                  </ul>
                </div>
              </div>
              
              <div class="content">
                <h2>Welcome to the NetSuite REST API Browser</h2>
                <p>This application allows you to explore the NetSuite REST API endpoints and interact with them directly. Select an option from the sidebar to begin.</p>
                
                <div class="info">
                  <h3>About the NetSuite REST API</h3>
                  <p>The NetSuite REST API consists of a dynamic schema described by a metadata catalog. This catalog provides information about all available resources, including record types, fields, and supported operations.</p>
                  <p>Using this browser, you can:</p>
                  <ul>
                    <li>Explore all available record types</li>
                    <li>View the structure of specific record types</li>
                    <li>Understand supported operations for each endpoint</li>
                    <li>Test API calls and view responses</li>
                  </ul>
                </div>
              </div>
            </div>
          ` : `
            <div class="info">
              <h3>No Token Available</h3>
              <p>You need to authenticate with NetSuite to get a token.</p>
            </div>
          `}
        </div>
        
        ${!hasToken ? `
          <h2>Authorize with NetSuite</h2>
          <p>Click the button below to start the OAuth flow:</p>
          <a href="${auth.url}" class="button">Authorize with NetSuite</a>
          
          <h3>Debug Information</h3>
          <p>Authorization URL:</p>
          <pre>${auth.url}</pre>
          <p>State: ${auth.state}</p>
        ` : ''}
      </body>
      </html>
    `);
  });

  // OAuth callback endpoint
  router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    console.log('Callback received with query params:', req.query);
    console.log('Stored state:', authState);
    console.log('Received state:', state);
    
    // Handle error
    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authorization Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Authorization Error</h1>
          
          <div class="error">
            <h2>Error: ${error}</h2>
            <p>Full callback parameters:</p>
            <pre>${JSON.stringify(req.query, null, 2)}</pre>
          </div>
          
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
    
    // Validate state
    if (!state || state !== authState) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid State</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Invalid State</h1>
          
          <div class="error">
            <h2>Error: State Mismatch</h2>
            <p>The state parameter does not match what was sent. This could be a CSRF attempt.</p>
            <p>Expected: ${authState}</p>
            <p>Received: ${state}</p>
          </div>
          
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
    
    // Exchange code for token
    try {
      await netsuiteClient.getTokens(code);
      
      return res.redirect('./');
    } catch (error) {
      console.error('Error getting access token:', error.message);
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Token Error</h1>
          
          <div class="error">
            <h2>Error: Failed to get access token</h2>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
          </div>
          
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
  });

  // Token endpoints
  router.get('/token/info', (req, res) => {
    if (!netsuiteClient.accessToken) {
      return res.redirect('./');
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Information</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .token { word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>Token Information</h1>
        
        <div class="info">
          <h2>Access Token</h2>
          <p class="token">${netsuiteClient.accessToken}</p>
          
          <h2>Refresh Token</h2>
          <p class="token">${netsuiteClient.refreshToken}</p>
          
          <h2>Expiration</h2>
          <p>Token expires at: ${new Date(netsuiteClient.tokenExpiry).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timeZoneName: 'short'
          })}</p>
          <p>Time remaining: ${Math.floor((netsuiteClient.tokenExpiry - Date.now()) / 1000)} seconds</p>
          <p>Token valid: ${netsuiteClient.isTokenValid() ? 'Yes' : 'No, needs refresh'}</p>
        </div>
        
        <a href="/" class="button">Back to Home</a>
      </body>
      </html>
    `);
  });

  router.get('/token/refresh', async (req, res) => {
    if (!netsuiteClient.refreshToken) {
      return res.redirect('./');
    }
    
    try {
      await netsuiteClient.refreshAccessToken();
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Refreshed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>Token Refreshed</h1>
            <p>Your access token has been refreshed successfully.</p>
            <p>New expiry: ${new Date(netsuiteClient.tokenExpiry).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              timeZoneName: 'short'
            })}</p>
          </div>
          
          <a href="/" class="button">Back to Home</a>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Refresh Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Refresh Error</h1>
          
          <div class="error">
            <h2>Error: Failed to refresh token</h2>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
          </div>
          
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
  });

  router.get('/token/clear', (req, res) => {
    netsuiteClient.clearTokens();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tokens Cleared</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="info">
          <h1>Tokens Cleared</h1>
          <p>All tokens have been removed from memory and the token file has been deleted.</p>
        </div>
        
        <p>You'll need to authorize again to get new tokens.</p>
        <a href="/" class="button">Back to Home</a>
      </body>
      </html>
    `);
  });

  // API Metadata endpoints - replacing failing endpoints with informational pages
  router.get('/api/metadata/info', async (req, res) => {
    if (!netsuiteClient.accessToken) {
      return res.redirect('/');
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NetSuite API Information</title>
        <style>${commonCSS}</style>
      </head>
      <body>
        <h1>NetSuite REST API Information</h1>
        <p>Information about the NetSuite REST API and its limitations.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <div class="warning" style="margin-top: 20px;">
          <h3>⚠️ NetSuite REST API Limitations</h3>
          <p>The NetSuite REST API has strict URL format requirements:</p>
          <pre>https://{accountID}.suitetalk.api.netsuite.com/services/rest/record/v1/{recordname}/{recordid}</pre>
          <p>Standard metadata discovery endpoints are not supported by this NetSuite instance.</p>
          <p>This browser works around these limitations by:</p>
          <ul>
            <li>Providing predefined lists of common record types</li>
            <li>Enabling record lookup by internal ID</li>
            <li>Using the metadata/record endpoint to extract field information</li>
          </ul>
        </div>
        
        <div class="info" style="margin-top: 20px;">
          <h2>Available Operations</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <tr>
              <th style="padding: 8px; text-align: left;">Operation</th>
              <th style="padding: 8px; text-align: left;">Endpoint Format</th>
              <th style="padding: 8px; text-align: left;">HTTP Method</th>
              <th style="padding: 8px; text-align: left;">Description</th>
            </tr>
            <tr>
              <td style="padding: 8px;">Get a Record</td>
              <td style="padding: 8px;"><code>/services/rest/record/v1/{recordType}/{id}</code></td>
              <td style="padding: 8px;">GET</td>
              <td style="padding: 8px;">Retrieves a specific record by ID</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Create a Record</td>
              <td style="padding: 8px;"><code>/services/rest/record/v1/{recordType}</code></td>
              <td style="padding: 8px;">POST</td>
              <td style="padding: 8px;">Creates a new record</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Update a Record</td>
              <td style="padding: 8px;"><code>/services/rest/record/v1/{recordType}/{id}</code></td>
              <td style="padding: 8px;">PATCH</td>
              <td style="padding: 8px;">Updates a specific record</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Delete a Record</td>
              <td style="padding: 8px;"><code>/services/rest/record/v1/{recordType}/{id}</code></td>
              <td style="padding: 8px;">DELETE</td>
              <td style="padding: 8px;">Deletes a specific record</td>
            </tr>
            <tr>
              <td style="padding: 8px;">Get Record Metadata</td>
              <td style="padding: 8px;"><code>/services/rest/metadata/v1/metadata/record/{recordType}</code></td>
              <td style="padding: 8px;">GET</td>
              <td style="padding: 8px;">Gets metadata for a record type (fields and structure)</td>
            </tr>
          </table>
        </div>
        
        <div class="info" style="margin-top: 20px;">
          <h2>Learn More</h2>
          <p>For complete documentation of the NetSuite REST API, refer to:</p>
          <ul>
            <li><a href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1558708800.html" target="_blank">NetSuite REST API Documentation</a></li>
            <li><a href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545142231.html" target="_blank">NetSuite REST Record API</a></li>
          </ul>
        </div>
      </body>
      </html>
    `);
  });
  
  router.get('/api/metadata/catalog', async (req, res) => {
    // Redirect to the info page since the catalog endpoint doesn't work
    return res.redirect('/api/metadata/info');
  });
  
  router.get('/api/metadata/swagger', async (req, res) => {
    // Redirect to the info page since the swagger endpoint doesn't work
    return res.redirect('/api/metadata/info');
  });
  
  router.get('/api/metadata/jsonschema', async (req, res) => {
    // Redirect to the info page since the jsonschema endpoint doesn't work
    return res.redirect('/api/metadata/info');
  });

  // API Records endpoints
  router.get('/api/records/types', async (req, res) => {
    if (!netsuiteClient.accessToken) {
      return res.redirect('/');
    }
    
    // Instead of querying the API (which doesn't support listing all record types),
    // provide a predefined list of common NetSuite record types
    const recordTypes = [
      { name: 'account', description: 'Chart of accounts' },
      { name: 'customer', description: 'Customer records' },
      { name: 'contact', description: 'Contact records' },
      { name: 'employee', description: 'Employee records' },
      { name: 'vendor', description: 'Vendor records' },
      { name: 'item', description: 'Inventory and non-inventory items' },
      { name: 'salesOrder', description: 'Sales orders' },
      { name: 'purchaseOrder', description: 'Purchase orders' },
      { name: 'invoice', description: 'Invoices' },
      { name: 'cashSale', description: 'Cash sales' },
      { name: 'currency', description: 'Currency records' },
      { name: 'location', description: 'Location records' },
      { name: 'department', description: 'Department records' },
      { name: 'classification', description: 'Classification records' },
      { name: 'subsidiary', description: 'Subsidiary records' },
      { name: 'depositApplication', description: 'Deposit applications' },
      { name: 'deposit', description: 'Deposits' },
      { name: 'customerPayment', description: 'Customer payments' },
      { name: 'opportunity', description: 'Opportunities' },
      { name: 'vendorBill', description: 'Vendor bills' },
      { name: 'vendorPayment', description: 'Vendor payments' },
      { name: 'journalEntry', description: 'Journal entries' },
      { name: 'inventoryAdjustment', description: 'Inventory adjustments' }
    ].sort((a, b) => a.name.localeCompare(b.name));
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Record Types</title>
        <style>${commonCSS}</style>
        <script>
          function filterTable() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toUpperCase();
            const table = document.getElementById('recordTable');
            const tr = table.getElementsByTagName('tr');
            
            for (let i = 0; i < tr.length; i++) {
              const td = tr[i].getElementsByTagName('td')[0];
              if (td) {
                const txtValue = td.textContent || td.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                  tr[i].style.display = '';
                } else {
                  tr[i].style.display = 'none';
                }
              } 
            }
          </script>
      </head>
      <body>
        <h1>NetSuite Record Types</h1>
        <p>This page displays common record types in the NetSuite REST API.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <div class="warning" style="margin-top: 20px;">
          <h3>⚠️ NetSuite API Limitation</h3>
          <p>NetSuite's REST API does not provide an endpoint to list all available record types. This is a predefined list of common record types.</p>
          <p>The API requires specific URL formats. Record URLs must be constructed as:</p>
          <pre>https://{accountID}.suitetalk.api.netsuite.com/services/rest/record/v1/{recordname}/{recordid}</pre>
        </div>
        
        <div class="record-search" style="margin-top: 20px;">
          <h3>Access a Specific Record</h3>
          <form action="javascript:void(0);" onsubmit="window.location.href='/api/records/' + document.getElementById('recordType').value">
            <input type="text" id="recordType" placeholder="Enter record type (e.g., customer, salesOrder)" required>
            <button type="submit">Go to Record Type</button>
          </form>
        </div>
        
        <h2>Record Types (${recordTypes.length})</h2>
        <input type="text" id="searchInput" class="search-box" onkeyup="filterTable()" placeholder="Search for record types...">
        
        <table id="recordTable">
          <tr>
            <th>Record Type</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
          ${recordTypes.map(record => `
            <tr>
              <td>${record.name}</td>
              <td>${record.description}</td>
              <td>
                <a href="/api/records/${record.name}">View</a> | 
                <a href="/api/records/${record.name}?fields=true">Fields</a>
              </td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `);
  });

  // Generic record endpoint handler
  router.get('/api/records/:recordType', async (req, res) => {
    if (!netsuiteClient.accessToken) {
      return res.redirect('/');
    }
    
    const { recordType } = req.params;
    const limit = req.query.limit || 5;
    const showFields = req.query.fields === 'true';
    const recordId = req.query.id;
    
    // Log the record type to verify it's available
    console.log(`Displaying record type: ${recordType}`);
    
    try {
      // If fields parameter is provided, show fields info instead of records
      if (showFields) {
        // Instead of trying to fetch metadata which isn't supported, show field info page
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${recordType} Fields</title>
            <style>${commonCSS}</style>
          </head>
          <body>
            <h1>${recordType} Fields</h1>
            <p>Field information for the '${recordType}' record type in NetSuite.</p>
            
            <div>
              <a href="/" class="button">Back to Home</a>
              <a href="/api/records/types" class="button">All Record Types</a>
              <a href="/api/records/${recordType}" class="button">Back to Records</a>
            </div>
            
            <div class="warning" style="margin-top: 20px;">
              <h3>⚠️ API Limitation</h3>
              <p>This NetSuite instance doesn't provide field metadata through the REST API. The metadata endpoints return:</p>
              <pre>Invalid request URL. The request URL must be constructed in the following way: 
https://&lt;accountID&gt;.suitetalk.api.netsuite.com/services/rest/record/v1/&lt;recordname&gt;/&lt;recordid&gt;</pre>
            </div>
            
            <div class="info" style="margin-top: 20px;">
              <h2>Finding Field Information</h2>
              <p>To discover fields for ${recordType} records, you can:</p>
              <ol>
                <li>View a specific ${recordType} record using the ID lookup</li>
                <li>Check the NetSuite UI for field names in forms and lists</li>
                <li>Refer to the NetSuite Record Browser in the NetSuite help center</li>
                <li>Create a SuiteScript that returns field metadata</li>
              </ol>
            </div>
            
            <div class="info" style="margin-top: 20px;">
              <h2>Common ${recordType} Fields</h2>
              <p>Here are some standard fields that are typically available on ${recordType} records:</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Field Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">id</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">Internal ID (primary key)</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">internalId</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">Same as id, used in some contexts</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">externalId</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">External identifier if specified</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">name</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">Name or title of the record</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">links</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">Related endpoint links</td>
                </tr>
              </table>
            </div>
            
            <div class="info" style="margin-top: 20px;">
              <h2>Sample Record Retrieval</h2>
              <p>To see all available fields, retrieve a specific record and examine its structure:</p>
              <form method="GET" action="/api/records/${recordType}">
                <input type="text" name="id" placeholder="Enter ${recordType} ID" required style="padding: 8px; width: 200px;">
                <button type="submit" style="padding: 8px 16px; background-color: #0078d7; color: white; border: none; border-radius: 4px; cursor: pointer;">View Record</button>
              </form>
            </div>
          </body>
          </html>
        `);
        return;
      }
      
      // If a specific record ID is provided
      if (recordId) {
        try {
          // Fetch a specific record by ID
          const data = await netsuiteClient.get(`/services/rest/record/v1/${recordType}/${recordId}`);
          
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${recordType} Record #${recordId}</title>
              <style>${commonCSS}</style>
            </head>
            <body>
              <h1>${recordType} Record #${recordId}</h1>
              <p>Displaying a specific ${recordType} record from the NetSuite REST API.</p>
              
              <div>
                <a href="/" class="button">Back to Home</a>
                <a href="/api/records/types" class="button">All Record Types</a>
                <a href="/api/records/${recordType}" class="button">Back to ${recordType} List</a>
                <a href="/api/records/${recordType}?fields=true" class="button-fields">View Fields</a>
              </div>
              
              <div style="margin-top: 20px;">
                <h2>Record Details</h2>
                <pre>${JSON.stringify(data, null, 2)}</pre>
              </div>
            </body>
            </html>
          `);
          return;
        } catch (error) {
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>API Error</title>
              <style>${commonCSS}</style>
            </head>
            <body>
              <h1>API Error</h1>
              
              <div class="error">
                <h2>Error Fetching ${recordType} Record #${recordId}</h2>
                <p>${error.message}</p>
                <pre>${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.stack}</pre>
              </div>
              
              <a href="/" class="button">Back to Home</a>
              <a href="/api/records/types" class="button">All Record Types</a>
              <a href="/api/records/${recordType}" class="button">Back to ${recordType} Records</a>
            </body>
            </html>
          `);
          return;
        }
      }
      
      // Show record search form (NetSuite API doesn't allow listing records without specific criteria)
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${recordType} Records</title>
          <style>${commonCSS}</style>
        </head>
        <body>
          <h1>${recordType} Records</h1>
          <p>NetSuite REST API browser for ${recordType} records.</p>
          
          <div>
            <a href="/" class="button">Back to Home</a>
            <a href="/api/records/types" class="button">All Record Types</a>
            <a href="?fields=true" class="button-fields">★ View Available Fields ★</a>
          </div>
          
          <div class="warning" style="margin-top: 20px;">
            <h3>⚠️ NetSuite API Limitation</h3>
            <p>The NetSuite REST API requires a specific record ID to view a record. The API does not allow listing all records of a type without additional search criteria.</p>
            <p>To view a record, you must know its Internal ID in NetSuite.</p>
            <pre>https://{accountID}.suitetalk.api.netsuite.com/services/rest/record/v1/${recordType}/{recordid}</pre>
          </div>
          
          <div class="record-search" style="margin-top: 20px;">
            <h2>View a Specific ${recordType} Record</h2>
            <form method="GET">
              <label for="recordId">Enter ${recordType} Internal ID:</label><br>
              <input type="text" id="recordId" name="id" placeholder="Enter NetSuite internal ID" required style="padding: 8px; width: 300px; margin: 10px 0;">
              <button type="submit" style="padding: 8px 16px; background-color: #0078d7; color: white; border: none; border-radius: 4px; cursor: pointer;">View Record</button>
            </form>
          </div>
          
          <div class="info" style="margin-top: 20px;">
            <h2>About ${recordType} Records</h2>
            <p>To find the internal ID of a ${recordType} record:</p>
            <ol>
              <li>Log in to your NetSuite account</li>
              <li>Navigate to the ${recordType} record list</li>
              <li>Open a specific record</li>
              <li>The internal ID is usually visible in the URL or in the record information</li>
            </ol>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>API Error</title>
          <style>${commonCSS}</style>
        </head>
        <body>
          <h1>API Error</h1>
          
          <div class="error">
            <h2>Error Accessing ${recordType} Records</h2>
            <p>${error.message}</p>
            <pre>${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.stack}</pre>
          </div>
          
          <a href="/" class="button">Back to Home</a>
          <a href="/api/records/types" class="button">All Record Types</a>
        </body>
        </html>
      `);
    }
  });

  // New endpoint to get available fields for a record type
  router.get('/api/records/:recordType/fields', async (req, res) => {
    if (!netsuiteClient.accessToken) {
      return res.redirect('/');
    }
    
    const { recordType } = req.params;
    
    // Debug logging
    console.log(`=== FIELDS ENDPOINT ACCESSED ===`);
    console.log(`Record type: ${recordType}`);
    console.log(`=== END DEBUG ===`);
    
    // Redirect to the query parameter approach
    return res.redirect(`/api/records/${recordType}?fields=true`);
  });

  // Return the configured router
  return router;
};

// Add a standalone mode for running this directly
if (require.main === module) {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const path = require('path');
  
  console.log('Running in standalone mode as primary application');
  
  // Serve static files from assets directory - look in multiple places
  const possibleAssetsPaths = [
    path.resolve(__dirname, '../../assets'),  // In container
    path.resolve(__dirname, '../assets'),     // Direct child of rest-api-browser
    path.resolve(__dirname, '../../../assets') // In project root
  ];
  
  // Find the first path that exists
  const fs = require('fs');
  let assetsPath = null;
  
  for (const testPath of possibleAssetsPaths) {
    try {
      if (fs.existsSync(testPath)) {
        assetsPath = testPath;
        break;
      }
    } catch (err) {
      // Continue to next path
    }
  }
  
  if (assetsPath) {
    app.use('/assets', express.static(assetsPath));
    console.log(`Serving static assets from: ${assetsPath}`);
  } else {
    console.warn('Warning: Could not find assets directory. Static files will not be served.');
  }
  
  // Validate required environment variables for standalone mode
  const requiredEnvVars = ['ACCOUNT_ID', 'CLIENT_ID', 'CLIENT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    console.error('Please create a .env file with these variables.');
    process.exit(1);
  }
  
  // Create client with proper config object
  const netsuiteClient = new NetSuiteOAuth({
    accountId: process.env.ACCOUNT_ID,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`
  });
  
  // Mount the router at the root
  app.use('/', module.exports(netsuiteClient));
  
  // Add additional debugging middleware to log all requests
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`\n=== NetSuite REST API Browser (Standalone Mode) ===`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Account ID: ${process.env.ACCOUNT_ID}`);
    console.log(`OAuth Token Status: ${netsuiteClient.accessToken ? 'Token available' : 'No token'}`);
    if (netsuiteClient.accessToken) {
      console.log(`Token Valid: ${netsuiteClient.isTokenValid() ? 'Yes' : 'No, needs refresh'}`);
      console.log(`Token Expires: ${new Date(netsuiteClient.tokenExpiry).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeZoneName: 'short'
      })}`);
    }
  }); 
} 