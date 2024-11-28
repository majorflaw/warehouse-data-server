const express = require('express');
const dotenv = require('dotenv');
const dropboxService = require('./src/services/dropboxService');
const cors = require('cors'); // Add this line
const passport = require('passport');
const session = require('express-session');
const DropboxStrategy = require('passport-dropbox-oauth2').Strategy;

// Load environment variables
dotenv.config();

// Create a function to validate our required environment variables
function validateEnvironmentVariables() {
    const requiredVars = [
        'DROPBOX_APP_KEY',
        'DROPBOX_APP_SECRET',
        'SESSION_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Validate environment variables before starting the server
validateEnvironmentVariables();

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

// Configure session middleware with explicit secret
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport after session middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategy
passport.use(new DropboxStrategy({
    apiVersion: '2',
    clientID: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
    callbackURL: 'https://warehouse-data-server.onrender.com/auth/callback',
    tokenAccessType: 'offline'  // This requests a refresh token
}, (accessToken, refreshToken, profile, done) => {
    console.log('=== IMPORTANT: ADD THESE TOKENS TO YOUR ENVIRONMENT VARIABLES ===');
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('=== END TOKENS ===');
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Add authentication routes
app.get('/auth/dropbox', passport.authenticate('dropbox-oauth2'));

app.get('/auth/callback', 
    passport.authenticate('dropbox-oauth2', { failureRedirect: '/login' }),
    (req, res) => {
        res.send('Authentication successful! Check server logs for tokens.');
    }
);
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

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Set up Passport strategy
passport.use(new DropboxStrategy({
    apiVersion: '2',
    clientID: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
    callbackURL: 'https://warehouse-data-server.onrender.com/auth/callback',
    tokenAccessType: 'offline'  // This requests a refresh token
}, (accessToken, refreshToken, profile, done) => {
    // Log tokens so we can grab them
    console.log('=== IMPORTANT: ADD THESE TOKENS TO YOUR ENVIRONMENT VARIABLES ===');
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

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