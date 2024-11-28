const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        // Cache lasts for 8 minutes, just under the 10-minute update interval you mentioned
        this.cache = new NodeCache({ stdTTL: 480 });
        this.lastModified = {};
    }

    // This method helps us construct the correct Dropbox path
    formatDropboxPath(folderName, fileName) {
        // We ensure the path is properly formatted with a leading slash
        // and no double slashes
        const path = `/${folderName}/${fileName}`.replace(/\/+/g, '/');
        console.log('Constructed Dropbox path:', path);
        return path;
    }

    async getDropboxFile(folderName, fileName, accessToken) {
        try {
            // First, let's construct the proper path
            const path = this.formatDropboxPath(folderName, fileName);
            console.log('Attempting to fetch file:', path);

            // Generate a unique cache key for this file
            const cacheKey = `file_${path}`;

            // Before making any API calls, let's check if we have a valid cached version
            if (this.cache.has(cacheKey)) {
                console.log('Found file in cache');
                return this.cache.get(cacheKey);
            }

            console.log('Making request to Dropbox API...');
            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: path
                    })
                }
            });

            // If we get here, the request was successful
            console.log('Successfully downloaded file from Dropbox');
            
            // Store in cache for future requests
            this.cache.set(cacheKey, response.data);
            
            return response.data;

        } catch (error) {
            // Provide detailed error information to help with debugging
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                path: `${folderName}/${fileName}`
            });
            
            throw new Error(`Failed to fetch file: ${error.message}`);
        }
    }
}

module.exports = new DropboxService();