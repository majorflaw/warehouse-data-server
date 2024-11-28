const axios = require('axios');
const qs = require('querystring');

class TokenManager {
    constructor() {
        // Initialize with tokens from environment variables if they exist
        this.accessToken = process.env.DROPBOX_ACCESS_TOKEN;
        this.refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        this.tokenExpiry = null;
    }

    // Get current access token, refresh if needed
    async getValidAccessToken() {
        // If we don't have a refresh token, we can't do automatic refresh
        if (!this.refreshToken) {
            throw new Error('No refresh token available. Initial authentication required.');
        }

        // If token is expired or will expire in next 5 minutes, refresh it
        if (this.shouldRefreshToken()) {
            await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    shouldRefreshToken() {
        // If we don't have an access token or expiry time, we need to refresh
        if (!this.accessToken || !this.tokenExpiry) {
            return true;
        }

        // Refresh if token will expire in next 5 minutes
        const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
        return Date.now() + expiryBuffer >= this.tokenExpiry;
    }

    async refreshAccessToken() {
        try {
            const response = await axios({
                method: 'post',
                url: 'https://api.dropbox.com/oauth2/token',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: process.env.DROPBOX_APP_KEY,
                    client_secret: process.env.DROPBOX_APP_SECRET
                })
            });

            // Update tokens
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('Access token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing access token:', error.message);
            throw error;
        }
    }

    // Used during initial authentication to store tokens
    setTokens(accessToken, refreshToken, expiresIn) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        // Log the refresh token during initial setup so you can add it to environment variables
        console.log('IMPORTANT: Add this refresh token to your environment variables:');
        console.log(`DROPBOX_REFRESH_TOKEN=${refreshToken}`);
    }
}

// Export a single instance to be used throughout the application
module.exports = new TokenManager();