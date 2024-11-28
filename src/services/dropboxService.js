const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 480 });
        this.lastModified = {};
    }

    async getDropboxFile(folderName, fileName, accessToken) {
        try {
            // Construct the proper path as before
            const path = this.formatDropboxPath(folderName, fileName);
            console.log('Attempting to fetch file:', path);

            const cacheKey = `file_${path}`;
            if (this.cache.has(cacheKey)) {
                console.log('Found file in cache');
                return this.cache.get(cacheKey);
            }

            console.log('Making request to Dropbox API...');
            
            // Here's the key change - we're setting the correct headers
            // Notice we're adding both the Authorization and the correct Content-Type
            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: path
                    }),
                    'Content-Type': '' // This empty string lets axios set the correct default
                }
            });

            console.log('Successfully downloaded file from Dropbox');
            this.cache.set(cacheKey, response.data);
            return response.data;

        } catch (error) {
            // Enhanced error logging to help us identify any future issues
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                path: `${folderName}/${fileName}`,
                headers: error.response?.headers // Log headers to see what's being sent
            });
            
            throw new Error(`Failed to fetch file: ${error.message}`);
        }
    }

    formatDropboxPath(folderName, fileName) {
        const path = `/${folderName}/${fileName}`.replace(/\/+/g, '/');
        console.log('Constructed Dropbox path:', path);
        return path;
    }
}

module.exports = new DropboxService();