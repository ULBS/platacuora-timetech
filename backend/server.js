const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import configurations
const passportConfig = require('./src/config/passport.config');
const jwtConfig = require('./src/config/jwt.config');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration for Passport
app.use(session({
  secret: jwtConfig.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: jwtConfig.cookieMaxAge
  }
}));

// Initialize Passport
app.use(passport.initialize());
passportConfig();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// API Routes
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const calendarRoutes = require('./src/routes/calendar.routes');
const semesterRoutes = require('./src/routes/semester.routes');
const teachingHoursRoutes = require('./src/routes/teaching-hours.routes');
const paymentRoutes = require('./src/routes/payment.routes');

// Register routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/calendar', calendarRoutes);
apiRouter.use('/semester', semesterRoutes);
apiRouter.use('/teaching-hours', teachingHoursRoutes);
apiRouter.use('/payment', paymentRoutes);

// Test route
apiRouter.get('/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});