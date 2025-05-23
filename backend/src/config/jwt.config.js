// JWT configuration settings
module.exports = {
  secret: process.env.JWT_SECRET || 'platacuora-super-secret-key-for-authentication-2025',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Used in cookie settings
  cookieMaxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
};
