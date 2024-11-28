const express = require('express');
const dotenv = require('dotenv');
const dropboxService = require('./src/services/dropboxService');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Basic health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'Server is running!' });
});

// Endpoint to fetch data from testing folder
app.get('/api/testing/:filename', async (req, res) => {
    try {
        const path = `/testing/${req.params.filename}`;
        const data = await dropboxService.getDropboxFile(
            path,
            process.env.DROPBOX_ACCESS_TOKEN
        );
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

// Endpoint to fetch data from testing_cvg folder
app.get('/api/testing-cvg/:filename', async (req, res) => {
    try {
        const path = `/testing_cvg/${req.params.filename}`;
        const data = await dropboxService.getDropboxFile(
            path,
            process.env.DROPBOX_ACCESS_TOKEN
        );
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});