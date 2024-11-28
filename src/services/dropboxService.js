const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 480 });
        this.lastModified = {};
    }

    async getDropboxFile(path, accessToken) {
        try {
            // Add logging to see what path we're trying to access
            console.log('Attempting to access file at path:', path);

            // Ensure path starts with '/'
            const formattedPath = path.startsWith('/') ? path : `/${path}`;
            console.log('Formatted path:', formattedPath);

            const metadata = await this.getFileMetadata(formattedPath, accessToken);
            console.log('File metadata:', metadata);

            const cacheKey = `file_${formattedPath}`;

            if (this.cache.has(cacheKey) && 
                this.lastModified[formattedPath] === metadata.server_modified) {
                console.log(`Serving cached version of ${formattedPath}`);
                return this.cache.get(cacheKey);
            }

            console.log(`Downloading ${formattedPath} from Dropbox`);
            
            // Log the request details (but not the token)
            console.log('Making request with headers:', {
                'Dropbox-API-Arg': JSON.stringify({
                    path: formattedPath
                })
            });

            const response = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/download',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: formattedPath
                    })
                }
            });

            this.lastModified[formattedPath] = metadata.server_modified;
            this.cache.set(cacheKey, response.data);
            
            return response.data;
        } catch (error) {
            // Enhanced error logging
            console.error('Detailed error information:');
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Error Data:', error.response?.data);
            console.error('Path attempted:', path);
            throw error;
        }
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
            console.error('Metadata error details:');
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Error Data:', error.response?.data);
            throw error;
        }
    }
}

module.exports = new DropboxService();