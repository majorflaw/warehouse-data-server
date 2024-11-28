const express = require('express');
const dotenv = require('dotenv');
const dropboxService = require('./src/services/dropboxService');
const cors = require('cors'); // Add this line

// Load environment variables
dotenv.config();

const app = express();

// Add CORS middleware before other middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://majorflaw.github.io'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add middleware to increase request payload size limit
app.use(express.json({ limit: '150mb' })); // Allow larger JSON payloads
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Add timeout handling
app.use((req, res, next) => {
    // Set a timeout for all requests (5 minutes)
    req.setTimeout(300000); // 5 minutes in milliseconds
    next();
});

// Add error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler caught:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint with detailed information
app.get('/', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Modified endpoint to handle large files
app.get('/api/testing/:filename', async (req, res) => {
    try {
        console.log(`Starting request for file: ${req.params.filename}`);
        console.log('Current memory usage:', process.memoryUsage());
        
        // Set response headers for better client handling
        res.setHeader('Content-Type', 'application/json');
        
        // Stream the response instead of loading it all into memory
        const data = await dropboxService.getDropboxFile(
            'testing',
            req.params.filename,
            process.env.DROPBOX_ACCESS_TOKEN
        );

        console.log('File fetched successfully, sending response');
        res.json(data);
        
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            memory: process.memoryUsage()
        });
        
        // Send a more informative error response
        res.status(500).json({
            error: 'Failed to fetch file',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Modified endpoint to handle large files from testing_cvg folder
app.get('/api/testing-cvg/:filename', async (req, res) => {
    try {
        console.log(`Starting request for CVG file: ${req.params.filename}`);
        console.log('Current memory usage:', process.memoryUsage());
        
        // Set response headers for better client handling
        res.setHeader('Content-Type', 'application/json');
        
        // Stream the response instead of loading it all into memory
        const data = await dropboxService.getDropboxFile(
            'testing_cvg',  // Note the different folder name here
            req.params.filename,
            process.env.DROPBOX_ACCESS_TOKEN
        );

        console.log('CVG file fetched successfully, sending response');
        res.json(data);
        
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            memory: process.memoryUsage()
        });
        
        // Send a more informative error response
        res.status(500).json({
            error: 'Failed to fetch CVG file',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server with proper error handling
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT} at ${new Date().toISOString()}`);
    console.log('Initial memory usage:', process.memoryUsage());
});

// Handle server-level errors
server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1); // This will trigger a restart on Render.com
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, but log the error
});