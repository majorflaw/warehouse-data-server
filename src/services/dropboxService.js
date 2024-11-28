const axios = require('axios');
const NodeCache = require('node-cache');

class DropboxService {
    constructor() {
        // Cache files for 8 minutes (slightly less than the 10-minute update interval)
        this.cache = new NodeCache({ stdTTL: 480 });
        
        // Store last modified times to check for updates
        this.lastModified = {};
    }

    async getDropboxFile(path, accessToken) {
        try {
            // First, get metadata to check if file has changed
            const metadata = await this.getFileMetadata(path, accessToken);
            const cacheKey = `file_${path}`;
            
            // If we have a cached version and file hasn't changed, return cached version
            if (this.cache.has(cacheKey) && 
                this.lastModified[path] === metadata.server_modified) {
                console.log(`Serving cached version of ${path}`);
                return this.cache.get(cacheKey);
            }

            // File has changed or isn't cached, download it
            console.log(`Downloading ${path} from Dropbox`);
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

            // Update cache and last modified time
            this.lastModified[path] = metadata.server_modified;
            this.cache.set(cacheKey, response.data);
            
            return response.data;
        } catch (error) {
            console.error('Error fetching file from Dropbox:', error.message);
            throw error;
        }
    }

    async getFileMetadata(path, accessToken) {
        try {
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
            console.error('Error getting file metadata:', error.message);
            throw error;
        }
    }
}

module.exports = new DropboxService();