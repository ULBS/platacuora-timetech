// Only for testing purposes
// This file is used to generate a JWT token for testing
require('dotenv').config();
const jwt = require('jsonwebtoken');

const payload = { id: '<someUserId>', email:'you@ulbsibiu.ro', role:'admin' };
const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

console.log(token);
