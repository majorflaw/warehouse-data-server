const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 480 });
        this.lastModified = {};
    }

    async getDropboxFile(path, accessToken) {
        try {
            // Clean up the path to ensure proper format
            const cleanPath = this.formatPath(path);
            console.log('Attempting to access Dropbox file with path:', cleanPath);

            // First verify the token is valid
            await this.verifyToken(accessToken);
            console.log('Access token verified successfully');

            // Get file metadata first to confirm file exists
            const metadata = await this.getFileMetadata(cleanPath, accessToken);
            console.log('File found! Metadata:', JSON.stringify(metadata, null, 2));

            const cacheKey = `file_${cleanPath}`;

            // Check cache
            if (this.cache.has(cacheKey) && 
                this.lastModified[cleanPath] === metadata.server_modified) {
                console.log('Returning cached version of file');
                return this.cache.get(cacheKey);
            }

            console.log('Downloading fresh copy of file from Dropbox');
            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: cleanPath
                    })
                }
            });

            console.log('File downloaded successfully');
            this.lastModified[cleanPath] = metadata.server_modified;
            this.cache.set(cacheKey, response.data);
            
            return response.data;
        } catch (error) {
            console.error('Error in getDropboxFile:');
            console.error('Status:', error.response?.status);
            console.error('Error message:', error.response?.data?.error_summary || error.message);
            console.error('Full error data:', JSON.stringify(error.response?.data, null, 2));
            throw new Error(`Failed to fetch Dropbox file: ${error.message}`);
        }
    }

    // New method to verify token
    async verifyToken(accessToken) {
        try {
            await axios({
                method: 'post',
                url: 'https://api.dropboxapi.com/2/check/user',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: {}
            });
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    // New method to format paths correctly
    formatPath(path) {
        // Remove any Dropbox sharing URL components
        if (path.includes('dropbox.com')) {
            // Extract just the filename from the URL
            path = path.split('/').pop().split('?')[0];
        }
        
        // Ensure path starts with / and doesn't have double slashes
        path = path.startsWith('/') ? path : `/${path}`;
        return path.replace(/\/+/g, '/');
    }

    async getFileMetadata(path, accessToken) {
        try {
            console.log('Getting metadata for path:', path);
            
            const response = await axios({
                method: 'post',
                url: 'https://api.dropboxapi.com/2/files/get_metadata',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    path: path
                }
            });
            return response.data;
        } catch (error) {
            console.error('Metadata error:');
            console.error('Status:', error.response?.status);
            console.error('Error details:', error.response?.data?.error_summary);
            throw error;
        }
    }
}

module.exports = new DropboxService();