const axios = require('axios');
const NodeCache = require('node-cache');
const tokenManager = require('./tokenManager'); // Add this line

class DropboxService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 480,
            checkperiod: 60,
            useClones: false
        });
        this.lastModified = {};
    }

    async getDropboxFile(folderName, fileName, accessToken) {
        const path = this.formatDropboxPath(folderName, fileName);
        
        try {
            // First, get a valid access token using our token manager
            const validToken = await tokenManager.getValidAccessToken();
            console.log('Retrieved valid access token');

            console.log('Fetching file:', path);

            const cacheKey = `file_${path}`;
            if (this.cache.has(cacheKey)) {
                console.log('Returning cached version');
                return this.cache.get(cacheKey);
            }

            console.log('Making request to Dropbox API...');
            
            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${validToken}`, // Use the new valid token
                    'Dropbox-API-Arg': JSON.stringify({
                        path: path
                    }),
                    'Content-Type': ''
                },
                timeout: 300000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                responseType: 'json'
            });

            console.log('File downloaded successfully');
            
            this.cache.set(cacheKey, response.data);
            return response.data;

        } catch (error) {
            // Enhanced error logging with token status
            console.error('Detailed error information:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                attemptedPath: path,
                memoryUsage: process.memoryUsage(),
                hasRefreshToken: !!tokenManager.refreshToken // Log if we have a refresh token
            });
            
            throw error;
        }
    }

    formatDropboxPath(folderName, fileName) {
        return `/${folderName}/${fileName}`.replace(/\/+/g, '/');
    }
}

module.exports = new DropboxService();