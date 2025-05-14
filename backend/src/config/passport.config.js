const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const googleConfig = require('./google-oauth.config');
const User = require('../models/user.model');

// Configure Passport Google OAuth Strategy
module.exports = () => {
  passport.use(new GoogleStrategy({
    clientID: googleConfig.clientID,
    clientSecret: googleConfig.clientSecret,
    callbackURL: googleConfig.callbackURL,
    passReqToCallback: googleConfig.passReqToCallback,
    scope: googleConfig.scope
    // TESTING: Removed hostedDomain restriction to allow Gmail accounts
    // To restrict to institutional emails in production, uncomment the following:
    // hostedDomain: googleConfig.hostedDomain
  }, (req, accessToken, refreshToken, profile, done) => {
    try {
      // Email validation happens in the auth controller
      // Just pass the profile to the controller
      return done(null, profile);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
