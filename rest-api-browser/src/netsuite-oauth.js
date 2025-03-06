const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Simple NetSuite OAuth client following the article approach
class NetSuiteOAuth {
  constructor(config) {
    this.accountId = config.accountId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    
    // Format account ID for URLs (replace underscore with dash for sandbox)
    const formattedAccountId = this.accountId.includes('_SB') 
      ? this.accountId.replace('_', '-') 
      : this.accountId;
    
    // Set up endpoints
    this.authEndpoint = `https://${formattedAccountId}.app.netsuite.com/app/login/oauth2/authorize.nl`;
    this.tokenEndpoint = `https://${formattedAccountId}.app.netsuite.com/services/rest/auth/oauth2/v1/token`;
    this.baseApiUrl = `https://${formattedAccountId}.suitetalk.api.netsuite.com`;
    
    // Token storage
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    // Token file path
    this.tokenFilePath = path.join(__dirname, '../tokens.json');
    
    // Try to load tokens from file
    this.loadTokens();
    
    console.log('NetSuite OAuth client initialized');
    console.log(`Account ID: ${this.accountId}`);
    console.log(`Auth endpoint: ${this.authEndpoint}`);
    console.log(`Token endpoint: ${this.tokenEndpoint}`);
    console.log(`API base URL: ${this.baseApiUrl}`);
    console.log(`Redirect URI: ${this.redirectUri}`);
    console.log(`Token status: ${this.accessToken ? 'Found stored token' : 'No stored token'}`);
    if (this.accessToken) {
      console.log(`Token expires: ${new Date(this.tokenExpiry).toLocaleString()}`);
      console.log(`Token valid: ${this.isTokenValid() ? 'Yes' : 'No, needs refresh'}`);
    }
  }
  
  // Step 1: Generate authorization URL (per article)
  getAuthorizationUrl(state = null) {
    // Generate a state parameter that meets NetSuite's requirements:
    // "The length of the state parameter must be between 24 and 1024 characters. 
    // Valid characters are all printable ASCII characters."
    const stateParam = state || this.generateCompliantState();
    
    // Build URL exactly as shown in the article
    const url = `${this.authEndpoint}?scope=rest_webservices&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&client_id=${encodeURIComponent(this.clientId)}&state=${encodeURIComponent(stateParam)}`;
    
    console.log('Authorization URL:', url);
    console.log('State parameter length:', stateParam.length);
    
    return {
      url,
      state: stateParam
    };
  }
  
  // Generate a state parameter that meets NetSuite's requirements
  generateCompliantState() {
    // Generate a state parameter at least 24 characters long
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 15);
    const secondRandomPart = Math.random().toString(36).substring(2, 15);
    
    // Combine parts to ensure we're over 24 characters
    const state = `${timestamp}_${randomPart}_${secondRandomPart}`;
    
    console.log('Generated state parameter with length:', state.length);
    return state;
  }
  
  // Step 2: Exchange code for tokens (per article)
  async getTokens(code) {
    try {
      console.log('Exchanging authorization code for tokens...');
      
      // Basic auth with client ID and secret
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      // Request body params per article
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', this.redirectUri);
      
      console.log('Request to token endpoint:', this.tokenEndpoint);
      console.log('Request params:', params.toString());
      
      // Make token request
      const response = await axios({
        method: 'POST',
        url: this.tokenEndpoint,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        },
        data: params
      });
      
      // Handle response
      console.log('Token response status:', response.status);
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        
        // Calculate expiry
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        
        console.log('Tokens received successfully');
        console.log('Access token expires in:', expiresIn, 'seconds');
        
        // Save tokens to file
        this.saveTokens();
        
        return {
          access_token: this.accessToken,
          refresh_token: this.refreshToken,
          expires_in: expiresIn,
          expires_at: this.tokenExpiry
        };
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('Error exchanging code for tokens:');
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else {
        console.error(error.message);
      }
      throw error;
    }
  }
  
  // Refresh access token using refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      console.log('Refreshing access token...');
      
      // Basic auth with client ID and secret
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      // Request body params
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', this.refreshToken);
      
      console.log('Request to token endpoint:', this.tokenEndpoint);
      
      // Make token refresh request
      const response = await axios({
        method: 'POST',
        url: this.tokenEndpoint,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`
        },
        data: params
      });
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        
        // Calculate expiry
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        
        // If a new refresh token is provided, update it
        if (response.data.refresh_token) {
          this.refreshToken = response.data.refresh_token;
        }
        
        console.log('Access token refreshed successfully');
        console.log('New access token expires in:', expiresIn, 'seconds');
        
        // Save updated tokens to file
        this.saveTokens();
        
        return {
          access_token: this.accessToken,
          refresh_token: this.refreshToken,
          expires_in: expiresIn,
          expires_at: this.tokenExpiry
        };
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('Error refreshing access token:');
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else {
        console.error(error.message);
      }
      throw error;
    }
  }
  
  // Check if the current token is valid
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    
    // Consider token invalid if it expires in less than 5 minutes
    const fiveMinutesMs = 5 * 60 * 1000;
    return this.tokenExpiry > Date.now() + fiveMinutesMs;
  }
  
  // Ensure we have a valid access token
  async ensureValidToken() {
    if (this.isTokenValid()) {
      return true;
    }
    
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.error('Failed to refresh token:', error.message);
        return false;
      }
    }
    
    return false;
  }
  
  // Save tokens to file
  saveTokens() {
    try {
      const tokenData = {
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
        expires_at: this.tokenExpiry,
        account_id: this.accountId
      };
      
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokenData, null, 2));
      console.log('Tokens saved to file:', this.tokenFilePath);
      return true;
    } catch (error) {
      console.error('Error saving tokens to file:', error.message);
      return false;
    }
  }
  
  // Load tokens from file
  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const tokenData = JSON.parse(fs.readFileSync(this.tokenFilePath, 'utf8'));
        
        // Only load tokens if they are for the same account
        if (tokenData.account_id === this.accountId) {
          this.accessToken = tokenData.access_token;
          this.refreshToken = tokenData.refresh_token;
          this.tokenExpiry = tokenData.expires_at;
          console.log('Tokens loaded from file');
          return true;
        } else {
          console.log('Stored tokens are for a different account, not loading');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading tokens from file:', error.message);
      return false;
    }
  }
  
  // Clear tokens
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
        console.log('Token file deleted');
      }
      return true;
    } catch (error) {
      console.error('Error deleting token file:', error.message);
      return false;
    }
  }
  
  // Make API requests with token
  async request(endpoint, method = 'GET', data = null) {
    // Ensure we have a valid token before making the request
    const tokenValid = await this.ensureValidToken();
    if (!tokenValid) {
      throw new Error('No valid access token available. Authorization required.');
    }
    
    try {
      const url = `${this.baseApiUrl}${endpoint}`;
      console.log(`Making ${method} request to:`, url);
      
      const response = await axios({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: method !== 'GET' ? data : undefined
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error making ${method} request:`);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else {
        console.error(error.message);
      }
      throw error;
    }
  }
  
  // Shorthand for GET requests
  async get(endpoint) {
    return this.request(endpoint, 'GET');
  }
  
  // Shorthand for POST requests
  async post(endpoint, data) {
    return this.request(endpoint, 'POST', data);
  }
}

module.exports = NetSuiteOAuth; 