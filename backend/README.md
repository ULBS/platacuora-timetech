# PlataCuOra - Backend Server

This is the backend server for the PlataCuOra (TimeTech) application, providing API endpoints for teaching hours tracking and payment declaration management.

## Features

- Google OAuth Authentication (supports institutional emails)
- User management with role-based authorization
- Academic calendar and semester management
- Teaching hours recording and validation
- Payment declaration workflow with approval process

## Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Google API credentials for OAuth

### Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd platacuora-timetech/backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Update the `.env` file with your actual configuration:
   - MongoDB connection string
   - Google OAuth credentials
   - JWT secret

### Configure Google OAuth

1. Go to the [Google Developer Console](https://console.developers.google.com/)
2. Create a new project
3. Enable the Google+ API
4. Create OAuth credentials (Web application type)
5. Add authorized JavaScript origins:
   - `http://localhost:5000` (development)
   - Your production URL
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - Your production callback URL
7. Add the Client ID and Secret to your `.env` file

## Running the Server

### Development Mode

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts when changes are detected.

### Production Mode

```bash
npm start
```

## API Endpoints

### Authentication

- `GET /api/auth/google` - Start Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/verify` - Verify JWT token

### Users

- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID (admin)
- `PUT /api/users/:id` - Update user role (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Calendar

- `POST /api/calendar` - Create calendar (admin)
- `GET /api/calendar` - Get calendars
- `GET /api/calendar/:id` - Get calendar by ID
- `PUT /api/calendar/:id` - Update calendar (admin)
- `DELETE /api/calendar/:id` - Delete calendar (admin)
- `GET /api/calendar/:id/holidays` - Get calendar holidays

### Semester Configuration

- `POST /api/semester` - Create semester config (admin)
- `GET /api/semester` - Get all semester configs
- `GET /api/semester/:id` - Get semester config by ID
- `PUT /api/semester/:id` - Update semester config (admin)
- `DELETE /api/semester/:id` - Delete semester config (admin)

### Teaching Hours

- `POST /api/teaching-hours` - Record teaching hours
- `GET /api/teaching-hours` - Get user's teaching hours
- `GET /api/teaching-hours/:id` - Get teaching hours by ID
- `PUT /api/teaching-hours/:id` - Update teaching hours
- `DELETE /api/teaching-hours/:id` - Delete teaching hours

### Payment Declarations

- `POST /api/payment` - Create payment declaration
- `GET /api/payment` - Get user's payment declarations
- `GET /api/payment/admin` - Get all payment declarations (admin)
- `GET /api/payment/:id` - Get payment declaration by ID
- `PUT /api/payment/:id` - Update payment declaration
- `DELETE /api/payment/:id` - Delete payment declaration
- `PUT /api/payment/:id/submit` - Submit for approval
- `PUT /api/payment/:id/approve` - Approve payment declaration (admin)
- `PUT /api/payment/:id/reject` - Reject payment declaration (admin)

## Domain Restriction for Email Authentication

For security reasons, this application is designed to allow only specific email domains to register and log in. Currently, it allows:

- `@ulbsibiu.ro` (institutional emails)
- `@gmail.com` (for testing purposes)

### Restricting to Institutional Emails Only

To restrict the application to only allow institutional emails (`@ulbsibiu.ro`), you need to make the following changes:

1. In `src/config/google-oauth.config.js`:
   - Uncomment the `hostedDomain: 'ulbsibiu.ro'` line
   - Remove `gmail.com` from the `allowedDomains` array

2. In `src/routes/auth.routes.js`:
   - Uncomment the `hostedDomain: 'ulbsibiu.ro'` line in the Google auth route

3. In `src/config/passport.config.js`:
   - Uncomment the `hostedDomain: googleConfig.hostedDomain` line

4. In `src/models/user.model.js`:
   - Replace the email validation regex with the original that only allows `@ulbsibiu.ro` domains

These changes are marked with `TESTING` comments in the codebase for easy identification.
