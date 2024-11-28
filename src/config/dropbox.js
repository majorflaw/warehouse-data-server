const passport = require('passport');
const DropboxStrategy = require('passport-dropbox-oauth2').Strategy;
const dotenv = require('dotenv');
const tokenManager = require('../services/tokenManager');

dotenv.config();

exports.initializeDropboxAuth = () => {
    passport.use(new DropboxStrategy({
        apiVersion: '2',
        clientID: process.env.DROPBOX_APP_KEY,
        clientSecret: process.env.DROPBOX_APP_SECRET,
        callbackURL: 'http://localhost:3000/auth/callback'
    },
    (accessToken, refreshToken, expires_in, profile, done) => {
        // Store tokens using token manager
        tokenManager.setTokens(accessToken, refreshToken, expires_in);
        return done(null, profile);
    }));

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));
};

// Export token manager for use in other parts of the application
exports.tokenManager = tokenManager;