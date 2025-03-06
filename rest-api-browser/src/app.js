require('dotenv').config();
const express = require('express');
const NetSuiteOAuth = require('./netsuite-oauth');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from assets directory
app.use('/assets', express.static('../../assets'));

// Validate required environment variables
const requiredEnvVars = ['ACCOUNT_ID', 'CLIENT_ID', 'CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please create a .env file with these variables.');
  process.exit(1);
}

// Set default redirect URI if not provided
const redirectUri = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;

// Initialize NetSuite OAuth client
const netsuiteClient = new NetSuiteOAuth({
  accountId: process.env.ACCOUNT_ID,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: redirectUri
});

// Store state for CSRF protection
let authState = null;

// Home page with link to start OAuth flow
app.get('/', (req, res) => {
  // Generate authorization URL
  const auth = netsuiteClient.getAuthorizationUrl();
  authState = auth.state;
  
  // Get token status
  const hasToken = netsuiteClient.accessToken !== null;
  const tokenValid = netsuiteClient.isTokenValid();
  const tokenExpiry = netsuiteClient.tokenExpiry ? new Date(netsuiteClient.tokenExpiry).toLocaleString() : 'N/A';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NetSuite REST API Browser</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="/assets/modern-ui.css">
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
              <a href="/token/info" class="button">View Token Details</a>
              <a href="/token/refresh" class="button">Refresh Token</a>
              <a href="/token/clear" class="button button-danger" onclick="return confirm('Are you sure you want to delete this token?')">Delete Token</a>
            </div>
          </div>
          
          <div class="main-container">
            <div class="sidebar">
              <h3>API Resources</h3>
              <div class="api-section">
                <h4>Metadata</h4>
                <ul class="resource-list">
                  <li><a href="/api/metadata/catalog">API Catalog</a></li>
                  <li><a href="/api/metadata/swagger">OpenAPI 3.0 Schema</a></li>
                  <li><a href="/api/metadata/jsonschema">JSON Schema</a></li>
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
app.get('/callback', async (req, res) => {
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
    await netsuiteClient.getAccessToken(code);
    
    return res.redirect('/');
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
app.get('/token/info', (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
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
        <p>Token expires at: ${new Date(netsuiteClient.tokenExpiry).toLocaleString()}</p>
        <p>Time remaining: ${Math.floor((netsuiteClient.tokenExpiry - Date.now()) / 1000)} seconds</p>
        <p>Token valid: ${netsuiteClient.isTokenValid() ? 'Yes' : 'No, needs refresh'}</p>
      </div>
      
      <a href="/" class="button">Back to Home</a>
    </body>
    </html>
  `);
});

app.get('/token/refresh', async (req, res) => {
  if (!netsuiteClient.refreshToken) {
    return res.redirect('/');
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
          <p>New expiry: ${new Date(netsuiteClient.tokenExpiry).toLocaleString()}</p>
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

app.get('/token/clear', (req, res) => {
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

// API Metadata endpoints
app.get('/api/metadata/catalog', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  try {
    // Fetch the metadata catalog listing available resources
    const data = await netsuiteClient.get('/services/rest/metadata/v1/metadata-catalog');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>API Metadata Catalog</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>API Metadata Catalog</h1>
        <p>This page displays the metadata catalog for the NetSuite REST API, showing all available resources.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <h2>Raw Response</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

app.get('/api/metadata/swagger', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  try {
    // Fetch the OpenAPI 3.0 schema for the record API
    const data = await netsuiteClient.get('/services/rest/metadata/v1/metadata/openapi');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OpenAPI 3.0 Schema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>OpenAPI 3.0 Schema</h1>
        <p>This page displays the OpenAPI 3.0 schema for the NetSuite REST API.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <h2>Raw Response</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

app.get('/api/metadata/jsonschema', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  try {
    // Fetch the JSON Schema for the record API
    const data = await netsuiteClient.get('/services/rest/metadata/v1/metadata/jsonschema');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JSON Schema</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>JSON Schema</h1>
        <p>This page displays the JSON Schema for the NetSuite REST API.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <h2>Raw Response</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

// API Records endpoints
app.get('/api/records/types', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  try {
    // Fetch the list of available record types
    const data = await netsuiteClient.get('/services/rest/record/v1');
    
    // Extract and organize record types
    const recordTypes = Object.keys(data.links || {})
      .filter(key => key !== 'self')
      .map(key => ({
        name: key,
        url: data.links[key].href
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Record Types</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .search-box { padding: 10px; margin: 20px 0; width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; }
        </style>
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
          }
        </script>
      </head>
      <body>
        <h1>NetSuite Record Types</h1>
        <p>This page displays all available record types in the NetSuite REST API.</p>
        
        <a href="/" class="button">Back to Home</a>
        
        <h2>Record Types (${recordTypes.length})</h2>
        <input type="text" id="searchInput" class="search-box" onkeyup="filterTable()" placeholder="Search for record types...">
        
        <table id="recordTable">
          <tr>
            <th>Record Type</th>
            <th>Actions</th>
          </tr>
          ${recordTypes.map(record => `
            <tr>
              <td>${record.name}</td>
              <td>
                <a href="/api/records/${record.name}">View</a>
              </td>
            </tr>
          `).join('')}
        </table>
        
        <h3>Raw Response</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

// Generic record endpoint handler
app.get('/api/records/:recordType', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  const { recordType } = req.params;
  const limit = req.query.limit || 5;
  
  try {
    // Fetch records of the specified type with a limit
    const data = await netsuiteClient.get(`/services/rest/record/v1/${recordType}?limit=${limit}`);
    
    // Get metadata about this record type
    let metadata = null;
    try {
      metadata = await netsuiteClient.get(`/services/rest/metadata/v1/metadata/record/${recordType}`);
    } catch (metadataError) {
      console.error(`Error fetching metadata for ${recordType}:`, metadataError.message);
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recordType} Records</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 500px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; }
          .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; }
          .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
          .tab button:hover { background-color: #ddd; }
          .tab button.active { background-color: #ccc; }
          .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; }
          .paginate { margin: 20px 0; }
        </style>
        <script>
          function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
              tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
          }
        </script>
      </head>
      <body>
        <h1>${recordType} Records</h1>
        <p>Displaying records of type '${recordType}' from the NetSuite REST API.</p>
        
        <div>
          <a href="/" class="button">Back to Home</a>
          <a href="/api/records/types" class="button">All Record Types</a>
        </div>
        
        <div class="paginate">
          <form action="/api/records/${recordType}" method="get">
            <label for="limit">Limit:</label>
            <input type="number" id="limit" name="limit" value="${limit}" min="1" max="50" style="width: 60px;">
            <button type="submit">Apply</button>
          </form>
        </div>
        
        <div class="tab">
          <button class="tablinks active" onclick="openTab(event, 'Records')">Records</button>
          ${metadata ? `<button class="tablinks" onclick="openTab(event, 'Metadata')">Metadata</button>` : ''}
          <button class="tablinks" onclick="openTab(event, 'Raw')">Raw Response</button>
        </div>
        
        <div id="Records" class="tabcontent" style="display: block;">
          <h2>Records (${data.count || 0})</h2>
          <pre>${JSON.stringify(data.items || data, null, 2)}</pre>
        </div>
        
        ${metadata ? `
          <div id="Metadata" class="tabcontent">
            <h2>Record Metadata</h2>
            <pre>${JSON.stringify(metadata, null, 2)}</pre>
          </div>
        ` : ''}
        
        <div id="Raw" class="tabcontent">
          <h2>Raw API Response</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
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
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        </style>
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

// Start the server
app.listen(PORT, () => {
  console.log(`\n=== NetSuite REST API Browser ===`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Account ID: ${process.env.ACCOUNT_ID}`);
  console.log(`OAuth Token Status: ${netsuiteClient.accessToken ? 'Token available' : 'No token'}`);
  if (netsuiteClient.accessToken) {
    console.log(`Token Valid: ${netsuiteClient.isTokenValid() ? 'Yes' : 'No, needs refresh'}`);
    console.log(`Token Expires: ${new Date(netsuiteClient.tokenExpiry).toLocaleTimeString()}`);
  }
}); 