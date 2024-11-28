const axios = require('axios');
const qs = require('querystring');

class TokenManager {
    constructor() {
        // Initialize with tokens from environment variables
        this.accessToken = process.env.DROPBOX_ACCESS_TOKEN;
        this.refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        this.tokenExpiry = null;
    }

    async getValidAccessToken() {
        if (!this.refreshToken) {
            console.error('No refresh token available');
            throw new Error('No refresh token available. Initial authentication required.');
        }

        if (this.shouldRefreshToken()) {
            console.log('Token needs refresh, initiating refresh process');
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
        const expiryBuffer = 5 * 60 * 1000;
        return Date.now() + expiryBuffer >= this.tokenExpiry;
    }

    async refreshAccessToken() {
        try {
            console.log('Refreshing access token...');
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

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('Access token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing token:', {
                message: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }
}

module.exports = new TokenManager();