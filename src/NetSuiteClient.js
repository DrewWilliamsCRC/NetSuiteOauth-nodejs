const axios = require('axios');
require('dotenv').config();

class NetSuiteClient {
    constructor(config) {
        // Store config values
        this.config = config;
        
        // Format URL properly - replace underscore with dash for sandbox accounts in the URL
        const urlAccountId = config.accountId.includes('_SB') 
            ? config.accountId.replace('_', '-') 
            : config.accountId;
            
        // Set base URL using the account-specific domain
        this.baseUrl = `https://${urlAccountId}.suitetalk.api.netsuite.com`;
        
        // Set the token endpoint - NetSuite requires using the account ID WITH underscore for the realm parameter
        this.tokenEndpoint = `https://${urlAccountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;
        
        console.log('Using base URL:', this.baseUrl);
        console.log('Using account ID:', config.accountId);
        console.log('Using client ID:', config.clientId ? 'Set (first 8 chars: ' + config.clientId.substring(0, 8) + '...)' : 'Not set');
        console.log('Using client secret:', config.clientSecret ? 'Set (hidden)' : 'Not set');
        
        // Initial token
        this.accessToken = null;
        this.tokenExpiration = null;
    }

    // Get a new access token using client credentials grant
    async authenticate() {
        try {
            console.log('Requesting OAuth 2.0 access token...');
            
            // Create basic auth header from client ID and secret
            const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
            
            // Prepare request parameters according to NetSuite specifications
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            
            // Add the scope parameter if provided
            if (this.config.scope) {
                params.append('scope', this.config.scope);
            }
            
            console.log('Token request parameters:', params.toString());
            console.log('Token endpoint:', this.tokenEndpoint);
            
            const response = await axios({
                method: 'POST',
                url: this.tokenEndpoint,
                data: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${basicAuth}`
                }
            });
            
            console.log('Token response status:', response.status);
            console.log('Token response contains access_token:', response.data.access_token ? 'Yes' : 'No');
            
            this.accessToken = response.data.access_token;
            
            // Calculate token expiration (subtract 60 seconds for safety)
            const expiresIn = response.data.expires_in || 3600;
            this.tokenExpiration = Date.now() + (expiresIn - 60) * 1000;
            
            console.log('Acquired OAuth 2.0 access token');
            return this.accessToken;
        } catch (error) {
            console.error('Error obtaining OAuth 2.0 token:');
            this.logError(error);
            
            // Provide more specific guidance based on error
            if (error.response && error.response.status === 400) {
                console.error('This appears to be an OAuth 2.0 configuration issue. Check:');
                console.error('1. Your integration in NetSuite is set up for OAuth 2.0');
                console.error('2. Your client ID and secret are correct');
                console.error('3. The integration has the "Client Credentials" grant type enabled');
                console.error('4. The NetSuite role has API permissions');
            }
            
            throw new Error(`Failed to authenticate: ${error.message}`);
        }
    }

    // Check if token is valid or get a new one
    async getValidToken() {
        if (!this.accessToken || Date.now() > this.tokenExpiration) {
            return this.authenticate();
        }
        return this.accessToken;
    }

    // Get authorization header
    async getAuthHeader() {
        const token = await this.getValidToken();
        return {
            Authorization: `Bearer ${token}`
        };
    }

    async get(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('Making GET request to:', url);

        try {
            const headers = {
                ...await this.getAuthHeader(),
                'Content-Type': 'application/json'
            };
            
            console.log('Request headers:', {
                ...headers,
                Authorization: 'Bearer [REDACTED]' // Don't log the actual token
            });
            
            const response = await axios({
                url,
                method: 'GET',
                headers
            });
            
            return response.data;
        } catch (error) {
            this.logError(error);
            throw new Error(`NetSuite API Error: ${error.message}`);
        }
    }

    async post(endpoint, data) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('Making POST request to:', url);

        try {
            const headers = {
                ...await this.getAuthHeader(),
                'Content-Type': 'application/json'
            };
            
            console.log('Request headers:', {
                ...headers,
                Authorization: 'Bearer [REDACTED]' // Don't log the actual token
            });
            
            const response = await axios({
                url,
                method: 'POST',
                headers,
                data
            });
            
            return response.data;
        } catch (error) {
            this.logError(error);
            throw new Error(`NetSuite API Error: ${error.message}`);
        }
    }
    
    logError(error) {
        console.error('Full error:');
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            console.error('No response received, request was:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        if (error.config) {
            console.error('Request configuration:', {
                url: error.config.url,
                method: error.config.method,
                headers: error.config.headers ? {
                    ...error.config.headers,
                    Authorization: error.config.headers.Authorization 
                        ? (error.config.headers.Authorization.startsWith('Basic') 
                            ? 'Basic [REDACTED]' 
                            : 'Bearer [REDACTED]')
                        : undefined
                } : undefined
            });
            if (error.config.data) {
                console.error('Request data:', error.config.data.toString());
            }
        }
    }
}

module.exports = NetSuiteClient; 