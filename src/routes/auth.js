const express = require('express');
const passport = require('passport');
const router = express.Router();

// Initialize authentication routes
router.get('/dropbox',
    passport.authenticate('dropbox-oauth2'));

router.get('/callback', 
    passport.authenticate('dropbox-oauth2', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication
        res.send('Authentication successful! You can close this window.');
    });

module.exports = router;