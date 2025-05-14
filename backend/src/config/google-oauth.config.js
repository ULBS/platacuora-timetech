// Google OAuth configuration settings
module.exports = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  passReqToCallback: true,
  scope: ['profile', 'email'],
  // Allow multiple domains - in production, uncomment the next line to restrict to ulbsibiu.ro only
  // hostedDomain: 'ulbsibiu.ro'
  
  // TESTING ONLY: Configuration that allows checking if email is from allowed domains
  // This makes it easy to remove gmail.com support by simply changing this setting
  allowedDomains: ['ulbsibiu.ro', 'gmail.com']
};
