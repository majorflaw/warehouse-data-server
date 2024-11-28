const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 480, // 8 minutes
            checkperiod: 60, // Check for expired keys every minute
            useClones: false // Don't clone objects to save memory
        });
        this.lastModified = {};
    }

    async getDropboxFile(folderName, fileName, accessToken) {
        try {
            const path = this.formatDropboxPath(folderName, fileName);
            console.log('Fetching file:', path);

            const cacheKey = `file_${path}`;
            if (this.cache.has(cacheKey)) {
                console.log('Returning cached version');
                return this.cache.get(cacheKey);
            }

            console.log('Making request to Dropbox API...');
            
            // Configure axios for large files
            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: path
                    }),
                    'Content-Type': ''
                },
                // Add timeout and size handling
                timeout: 300000, // 5 minutes
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                responseType: 'json'
            });

            console.log('File downloaded, size:', 
                response.data ? JSON.stringify(response.data).length : 'unknown');
            
            this.cache.set(cacheKey, response.data);
            return response.data;

        } catch (error) {
            console.error('Detailed error information:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                path: path,
                memoryUsage: process.memoryUsage()
            });
            
            throw error;
        }
    }

    formatDropboxPath(folderName, fileName) {
        return `/${folderName}/${fileName}`.replace(/\/+/g, '/');
    }
}

module.exports = new DropboxService();