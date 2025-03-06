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
      <title>NetSuite API Toolkit</title>
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
      <h1>NetSuite API Toolkit</h1>
      <p>OAuth 2.0 authentication and REST API tools for NetSuite.</p>
      
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
              <li><a href="/test/salesorder">Test /salesorder endpoint</a></li>
              <li><a href="/test/customer">Test /customer endpoint</a></li>
              <li><a href="/test/employee">Test /employee endpoint</a></li>
            </ul>
          </div>
          
          <div class="api-test" style="margin-top: 30px; background-color: #f0f8ff; padding: 15px; border-radius: 4px; border: 1px solid #b8daff;">
            <h3>🔍 REST API Browser</h3>
            <p>Explore and interact with all available NetSuite REST API endpoints in our comprehensive browser:</p>
            <a href="/api-browser" class="button" style="background-color: #007bff;">Launch REST API Browser</a>
          </div>
        ` : `
          <div class="info">
            <h3>No Token Available</h3>
            <p>You need to authenticate with NetSuite to get a token.</p>
          </div>
        `}
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

app.get('/test/salesorder', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/salesOrder?limit=5');
    res.send(`
      <h1>Sales Order API Test</h1>
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

app.get('/test/customer', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/customer?limit=5');
    res.send(`
      <h1>Customer API Test</h1>
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

app.get('/test/employee', async (req, res) => {
  try {
    const data = await netsuiteClient.get('/services/rest/record/v1/employee?limit=5');
    res.send(`
      <h1>Employee API Test</h1>
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

// REST API Browser page 
app.get('/api-browser', (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NetSuite REST API Browser</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px 0; }
        .warning { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .sidebar { width: 250px; float: left; background: #f8f9fa; height: 100%; padding: 15px; border-radius: 4px; }
        .content { margin-left: 280px; }
        .main-container { display: flex; }
        .resource-list { list-style-type: none; padding: 0; }
        .resource-list li { margin: 5px 0; }
        .resource-list a { text-decoration: none; color: #0078d7; }
        .resource-list a:hover { text-decoration: underline; }
        .api-section { margin-bottom: 20px; }
        h2 { border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
        .record-search { margin: 20px 0; }
        .record-search input[type="text"] { padding: 8px; width: 300px; border: 1px solid #ddd; border-radius: 4px; }
        .record-search button { padding: 8px 16px; background-color: #0078d7; color: white; border: none; border-radius: 4px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>NetSuite REST API Browser</h1>
      <p>Explore and test NetSuite REST API endpoints with OAuth 2.0 authentication.</p>
      <p><a href="/" class="button">Back to Home</a></p>
      
      <div class="info">
        <h2>About the NetSuite REST API</h2>
        <p>The NetSuite REST API allows you to interact with NetSuite records using standard HTTP methods. This browser helps you explore record-based endpoints.</p>
      </div>
      
      <div class="warning">
        <h3>⚠️ API Limitations</h3>
        <p>The NetSuite REST API requires specific URL formats. Record URLs must be constructed as:</p>
        <pre>https://{accountID}.suitetalk.api.netsuite.com/services/rest/record/v1/{recordname}/{recordid}</pre>
        <p>Many metadata discovery endpoints may be restricted based on your NetSuite implementation.</p>
      </div>
      
      <div class="record-search">
        <h2>Search for a Record Type</h2>
        <form action="/api/records/custom" method="get">
          <input type="text" name="recordType" placeholder="Enter record type (e.g., customer, salesOrder)" required>
          <button type="submit">Explore Record Type</button>
        </form>
      </div>
      
      <h2>Common Record Types</h2>
      <div class="main-container">
        <div class="content">
          <div class="api-section">
            <h3>Standard Records</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <a href="/api/records/custom?recordType=account" class="button">Account</a>
              <a href="/api/records/custom?recordType=customer" class="button">Customer</a>
              <a href="/api/records/custom?recordType=employee" class="button">Employee</a>
              <a href="/api/records/custom?recordType=salesOrder" class="button">Sales Order</a>
              <a href="/api/records/custom?recordType=currency" class="button">Currency</a>
              <a href="/api/records/custom?recordType=invoice" class="button">Invoice</a>
              <a href="/api/records/custom?recordType=vendor" class="button">Vendor</a>
              <a href="/api/records/custom?recordType=item" class="button">Item</a>
              <a href="/api/records/custom?recordType=contact" class="button">Contact</a>
              <a href="/api/records/custom?recordType=location" class="button">Location</a>
              <a href="/api/records/custom?recordType=department" class="button">Department</a>
              <a href="/api/records/custom?recordType=classification" class="button">Classification</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Updated API endpoint that works with NetSuite's URL restrictions
app.get('/api/records/custom', async (req, res) => {
  if (!netsuiteClient.accessToken) {
    return res.redirect('/');
  }
  
  const recordType = req.query.recordType;
  
  if (!recordType) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Missing Record Type</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          .error { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
          .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Error: Missing Record Type</h1>
        <div class="error">
          <p>Please specify a record type to explore.</p>
        </div>
        <a href="/api-browser" class="button">Back to API Browser</a>
      </body>
      </html>
    `);
  }
  
  const limit = req.query.limit || 5;
  
  try {
    // Fetch records of the specified type with a limit
    const data = await netsuiteClient.get(`/services/rest/record/v1/${recordType}?limit=${limit}`);
    
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
          .record-search { margin: 20px 0; }
          .record-search input[type="text"] { padding: 8px; width: 300px; border: 1px solid #ddd; border-radius: 4px; }
          .record-search button { padding: 8px 16px; background-color: #0078d7; color: white; border: none; border-radius: 4px; cursor: pointer; }
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
          <a href="/api-browser" class="button">Back to API Browser</a>
          <a href="/" class="button">Back to Home</a>
        </div>
        
        <div class="record-search">
          <h3>Explore Another Record Type</h3>
          <form action="/api/records/custom" method="get">
            <input type="text" name="recordType" placeholder="Enter record type (e.g., customer, salesOrder)" required>
            <button type="submit">Explore Record Type</button>
          </form>
        </div>
        
        <div class="paginate">
          <form action="/api/records/custom" method="get">
            <input type="hidden" name="recordType" value="${recordType}">
            <label for="limit">Records per page:</label>
            <input type="number" id="limit" name="limit" value="${limit}" min="1" max="50" style="width: 60px;">
            <button type="submit">Apply</button>
          </form>
        </div>
        
        <div class="tab">
          <button class="tablinks active" onclick="openTab(event, 'Records')">Records</button>
          <button class="tablinks" onclick="openTab(event, 'Raw')">Raw Response</button>
        </div>
        
        <div id="Records" class="tabcontent" style="display: block;">
          <h2>Records (${data.count || 0})</h2>
          <pre>${JSON.stringify(data.items || data, null, 2)}</pre>
        </div>
        
        <div id="Raw" class="tabcontent">
          <h2>Raw API Response</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
        
        ${data.links && data.links.pagination ? `
          <div style="margin-top: 20px;">
            <h3>Pagination</h3>
            ${data.links.pagination.prev ? `<a href="/api/records/custom?recordType=${recordType}&paginationToken=${encodeURIComponent(data.links.pagination.prev.token)}" class="button">Previous Page</a>` : ''}
            ${data.links.pagination.next ? `<a href="/api/records/custom?recordType=${recordType}&paginationToken=${encodeURIComponent(data.links.pagination.next.token)}" class="button">Next Page</a>` : ''}
          </div>
        ` : ''}
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
        
        <a href="/api-browser" class="button">Back to API Browser</a>
        <a href="/" class="button">Back to Home</a>
      </body>
      </html>
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