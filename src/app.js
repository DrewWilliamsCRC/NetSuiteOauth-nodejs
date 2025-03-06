require('dotenv').config();
const express = require('express');
const NetSuiteOAuth = require('./netsuite-oauth');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

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
      <title>NetSuite OAuth 2.0 Test</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .token-status { margin: 20px 0; }
        .api-test { margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>NetSuite OAuth 2.0 Test</h1>
      <p>This example follows the exact flow described in the article.</p>
      
      <div class="token-status">
        <h2>Token Status</h2>
        ${hasToken ? `
          <div class="${tokenValid ? 'success' : 'warning'}">
            <h3>${tokenValid ? '✅ Valid Token Available' : '⚠️ Token Expired'}</h3>
            <p><strong>Access Token:</strong> ${netsuiteClient.accessToken.substring(0, 15)}...[truncated]</p>
            <p><strong>Expires:</strong> ${tokenExpiry}</p>
            <p><strong>Status:</strong> ${tokenValid ? 'Valid' : 'Expired or expiring soon'}</p>
            <div>
              <a href="/token/info" class="button">View Token Details</a>
              <a href="/token/refresh" class="button">Refresh Token</a>
              <a href="/token/clear" class="button" onclick="return confirm('Are you sure you want to delete this token?')">Delete Token</a>
            </div>
          </div>
          
          <div class="api-test">
            <h3>Test API with Stored Token</h3>
            <ul>
              <li><a href="/test/account">Test /account endpoint</a></li>
              <li><a href="/test/accountsettings">Test /accountsettings endpoint</a></li>
              <li><a href="/test/currency">Test /currency endpoint</a></li>
            </ul>
          </div>
        ` : `
          <div class="info">
            <h3>No Token Available</h3>
            <p>You need to authenticate with NetSuite to get a token.</p>
          </div>
        `}
      </div>
      
      <div class="warning">
        <h3>⚠️ Important Role Information</h3>
        <p>The NetSuite Administrator role (ID: 3) cannot be used for OAuth token exchange as it lacks the "Login with Access Tokens" permission.</p>
        <p>When you click the button below, you may be automatically assigned the Administrator role. If this happens and you get an "invalid_request" error:</p>
        <ol>
          <li>Log in to NetSuite</li>
          <li>Go to Setup > Integration > Integration Management > Manage Integrations</li>
          <li>Edit your integration record</li>
          <li>Make sure "Authorization Code Grant" is selected</li>
          <li>Assign a non-Administrator role with "Login with Access Tokens" permission</li>
        </ol>
      </div>
      
      <h2>Step 1: Authorize with NetSuite</h2>
      <p>Click the button below to start the OAuth flow:</p>
      <a href="${auth.url}" class="button">Authorize with NetSuite</a>
      
      <h3>Debug Information</h3>
      <p>Authorization URL:</p>
      <pre>${auth.url}</pre>
      <p>State: ${auth.state}</p>
    </body>
    </html>
  `);
});

// OAuth callback endpoint
app.get('/callback', async (req, res) => {
  const { code, state, error, role, entity, company } = req.query;
  
  console.log('Callback received with query params:', req.query);
  console.log('Stored state:', authState);
  console.log('Received state:', state);
  console.log('State parameter length:', state ? state.length : 0);
  
  // Handle error
  if (error) {
    // Special handling for invalid_request when role=3 (Administrator)
    if (error === 'invalid_request' && role === '3') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>NetSuite Role Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Role Permission Error</h1>
          
          <div class="error">
            <h2>Error: Administrator Role Cannot Be Used</h2>
            <p>The NetSuite Administrator role (ID: 3) cannot be used for OAuth token exchange because it lacks the "Login with Access Tokens" permission.</p>
            <p>Current callback parameters:</p>
            <pre>${JSON.stringify(req.query, null, 2)}</pre>
          </div>
          
          <div class="info">
            <h2>How to Fix This Issue:</h2>
            <ol>
              <li><strong>Log in to NetSuite</strong> with an Administrator account</li>
              <li>Go to <strong>Setup > Integration > Integration Management > Manage Integrations</strong></li>
              <li><strong>Edit your integration record</strong> (the one with Client ID: ${process.env.CLIENT_ID.substring(0, 6)}...)</li>
              <li>Make sure <strong>"Authorization Code Grant"</strong> is selected as the authentication type</li>
              <li><strong>Assign a non-Administrator role</strong> in the integration record that has:</li>
                <ul>
                  <li>"Login with Access Tokens" permission enabled</li>
                  <li>"REST Web Services" permission enabled</li>
                </ul>
              <li>Some roles that might work: "Full Access" or custom roles specifically created for API access</li>
              <li>Ensure your redirect URI exactly matches: <strong>${redirectUri}</strong></li>
              <li>Save the integration record</li>
            </ol>
          </div>
          
          <p>After making these changes, try the authorization flow again:</p>
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
    
    // Check if the error might be related to the state parameter
    if (error === 'invalid_request' && (!state || state.length < 24)) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>State Parameter Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>State Parameter Error</h1>
          
          <div class="error">
            <h2>Error: State Parameter Issue</h2>
            <p>The error may be related to the state parameter. NetSuite requires the state parameter to be between 24 and 1024 characters.</p>
            <p>Your state parameter length: ${state ? state.length : 'No state parameter found'}</p>
            <p>Current callback parameters:</p>
            <pre>${JSON.stringify(req.query, null, 2)}</pre>
          </div>
          
          <div class="info">
            <h2>Our Implementation</h2>
            <p>We have updated our code to generate a state parameter that should meet NetSuite's requirements. Please try again.</p>
          </div>
          
          <a href="/" class="button">Try Again</a>
        </body>
        </html>
      `);
    }
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
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
        
        <div class="info">
          <h2>Debug Information</h2>
          <ul>
            <li><strong>State parameter length:</strong> ${state ? state.length : 'No state parameter'}</li>
            <li><strong>NetSuite requires:</strong> State parameter length between 24-1024 characters</li>
            <li><strong>Role ID:</strong> ${role || 'Not specified'}</li>
            <li><strong>Entity:</strong> ${entity || 'Not specified'}</li>
            <li><strong>Company:</strong> ${company || 'Not specified'}</li>
          </ul>
        </div>
        
        <a href="/" class="button">Try Again</a>
      </body>
      </html>
    `);
  }
  
  // Validate state to prevent CSRF
  if (state !== authState) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Security Error</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>Security Error</h1>
        
        <div class="error">
          <h2>Invalid State Parameter</h2>
          <p>This could be a CSRF attempt or an issue with the state parameter handling.</p>
          <ul>
            <li><strong>Expected:</strong> ${authState}</li>
            <li><strong>Expected length:</strong> ${authState ? authState.length : 0} characters</li>
            <li><strong>Received:</strong> ${state}</li>
            <li><strong>Received length:</strong> ${state ? state.length : 0} characters</li>
          </ul>
        </div>
        
        <a href="/" class="button">Try Again</a>
      </body>
      </html>
    `);
  }
  
  // Exchange code for tokens
  try {
    if (!code) {
      throw new Error('No authorization code provided in callback');
    }
    
    const tokens = await netsuiteClient.getTokens(code);
    
    // Display success with token info
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NetSuite OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          .token { word-break: break-all; }
          .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>Authorization Successful! 🎉</h1>
          <p>Your application has been successfully authorized with NetSuite.</p>
          <p>Tokens have been saved to file and will be used for future requests.</p>
        </div>
        
        <h2>Access Token</h2>
        <p class="token">${tokens.access_token.substring(0, 20)}...[truncated]</p>
        
        <h2>Refresh Token</h2>
        <p class="token">${tokens.refresh_token.substring(0, 20)}...[truncated]</p>
        
        <h2>Token Expiration</h2>
        <p>Expires in ${tokens.expires_in} seconds (at ${new Date(tokens.expires_at).toLocaleString()})</p>
        
        <h2>What's Next?</h2>
        <p>You can now use the NetSuite API with your access token. Return to the home page to see options:</p>
        <a href="/" class="button">Return to Home</a>
      </body>
      </html>
    `);
  } catch (error) {
    // Display error
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Exchange Error</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Token Exchange Error</h1>
          <p><strong>Error:</strong> ${error.message}</p>
          
          ${error.response ? `<p><strong>Status:</strong> ${error.response.status}</p>
          <p><strong>Response Data:</strong></p>
          <pre>${JSON.stringify(error.response.data, null, 2)}</pre>` : ''}
        </div>
        
        <p>Please check your NetSuite configuration and try again.</p>
        <a href="/" class="button">Try Again</a>
      </body>
      </html>
    `);
  }
});

// Token info endpoint
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

// Token refresh endpoint
app.get('/token/refresh', async (req, res) => {
  if (!netsuiteClient.refreshToken) {
    return res.redirect('/');
  }
  
  try {
    const tokens = await netsuiteClient.refreshAccessToken();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Refreshed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .token { word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>Token Refreshed Successfully</h1>
          <p>Your access token has been refreshed and saved.</p>
        </div>
        
        <h2>New Access Token</h2>
        <p class="token">${tokens.access_token.substring(0, 20)}...[truncated]</p>
        
        <h2>Token Expiration</h2>
        <p>Expires in ${tokens.expires_in} seconds (at ${new Date(tokens.expires_at).toLocaleString()})</p>
        
        <a href="/" class="button">Back to Home</a>
      </body>
    </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token Refresh Error</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Token Refresh Error</h1>
          <p><strong>Error:</strong> ${error.message}</p>
          
          ${error.response ? `<p><strong>Status:</strong> ${error.response.status}</p>
          <p><strong>Response Data:</strong></p>
          <pre>${JSON.stringify(error.response.data, null, 2)}</pre>` : ''}
        </div>
        
        <p>Your refresh token may have expired. You'll need to authorize again.</p>
        <a href="/" class="button">Back to Home</a>
      </body>
      </html>
    `);
  }
});

// Clear tokens endpoint
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

// Test API endpoints
app.get('/test/account', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/account');
    res.send(`
      <h1>Account API Test</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <a href="/">Back to Home</a>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

app.get('/test/accountsettings', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/accountsettings');
    res.send(`
      <h1>Account Settings API Test</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <a href="/">Back to Home</a>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

app.get('/test/currency', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/currency?limit=5');
    res.send(`
      <h1>Currency API Test</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <a href="/">Back to Home</a>
    `);
  } catch (error) {
    res.send(`
      <h1>API Error</h1>
      <p>Error: ${error.message}</p>
      <a href="/">Back to Home</a>
    `);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n=== NetSuite OAuth 2.0 Test Server ===`);
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Make sure this matches EXACTLY what's configured in your NetSuite integration\n`);
}); 