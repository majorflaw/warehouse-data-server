const express = require('express');
const dotenv = require('dotenv');
const dropboxService = require('./src/services/dropboxService');

// Load environment variables
dotenv.config();

const app = express();

// This middleware will help us track incoming requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Endpoint to fetch data from testing folder
app.get('/api/testing/:filename', async (req, res) => {
    try {
        console.log(`Requesting file: ${req.params.filename} from testing folder`);
        
        const data = await dropboxService.getDropboxFile(
            'testing',
            req.params.filename,
            process.env.DROPBOX_ACCESS_TOKEN
        );
        
        res.json(data);
    } catch (error) {
        console.error('Error serving file:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch file',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} at ${new Date().toISOString()}`);
});