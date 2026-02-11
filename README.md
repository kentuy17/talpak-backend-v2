# Talpak Backend V2

A comprehensive Node.js backend server for managing betting operations on cockfighting events. This system provides real-time betting capabilities, user management, fight tracking, and automated payout calculations.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Socket.IO Events](#socketio-events)
- [User Roles](#user-roles)

## ✨ Features

- **User Authentication**: Secure JWT-based authentication system
- **Real-time Updates**: Socket.IO integration for live fight updates and bet notifications
- **Fight Management**: Create, update, and track cockfighting events
- **Betting System**: Place bets on fights (meron/wala) with automatic odds calculation
- **Automated Payouts**: Process and calculate winnings based on fight results
- **Role-based Access**: Different user roles with specific permissions
- **Transaction Management**: Track runner transactions and cash operations
- **Database Migrations**: MongoDB migrations for schema updates

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v14.0.0 or higher
- **MongoDB**: v4.4 or higher
- **npm**: v6.0.0 or higher

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd talpak-backend-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017`
   - Database name: `talpakdb`

4. **Configure environment variables**
   - Create a `.env` file in the root directory
   - Add the following environment variables (see Configuration section)

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/talpakdb

# JWT Secret (generate a secure random string)
JWT_SECRET=your_secure_jwt_secret_here

# Client URL (for Socket.IO CORS)
CLIENT_URL=http://localhost:3000
```

### Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port number | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/talpakdb |
| JWT_SECRET | Secret key for JWT token signing | (required) |
| CLIENT_URL | Client application URL for CORS | * |

## 🚀 Running the Server

### Development Mode

Start the server with hot-reload using nodemon:

```bash
npm run dev
```

### Production Mode

Start the server normally:

```bash
node server.js
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Users

- `GET /api/users` - Get all users (protected)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)

### Game Events

- `GET /api/game-events` - Get all game events (protected)
- `POST /api/game-events` - Create a new game event (protected)
- `GET /api/game-events/:id` - Get game event by ID (protected)
- `PATCH /api/game-events/:id` - Update game event (protected)

### Fights

- `GET /api/fights/event/:eventId` - Get all fights for an event (protected)
- `GET /api/fights/current/:eventId` - Get current fight for an event (protected)
- `GET /api/fights/:id` - Get fight by ID (protected)
- `POST /api/fights` - Create a new fight (protected)
- `PATCH /api/fights/:id/status` - Update fight status (protected)
- `PATCH /api/fights/declare-winner` - Declare fight winner (protected)
- `PATCH /api/fights/complete` - Complete current fight (protected)

### Bet History

- `GET /api/bet-history` - Get all bet history (protected)
- `GET /api/bet-history/:id` - Get bet by ID (protected)
- `POST /api/bet-history` - Place a new bet (protected)
- `GET /api/bet-history/fight/:fightId` - Get bets for a specific fight (protected)

### Runners

- `GET /api/runners` - Get all runners (protected)
- `GET /api/runners/items?eventId=<eventId>&tellerNo=<tellerNo>` - Get bet items by event and teller number (protected)
- `POST /api/runners` - Create a new runner transaction (protected)
- `PATCH /api/runners/:id` - Update runner transaction (protected)

### Guests

- `GET /api/guests` - Get guest information
- `POST /api/guests` - Create guest session

## 📊 Database Schema

### User
- `username` (String, required, unique)
- `password` (String, required, hashed)
- `tellerNo` (Number)
- `role` (Enum: admin, cashinTeller, cashoutTeller, runner, controller)
- `isActive` (Boolean)
- `credits` (Number)
- `timestamps`

### Fight
- `eventId` (ObjectId, ref: GameEvent)
- `fightNumber` (Number)
- `meron` (Number) - Total bets on meron
- `wala` (Number) - Total bets on wala
- `createdBy` (ObjectId, ref: User)
- `status` (Enum: open, closed, completed, cancelled, waiting)
- `winner` (Enum: meron, wala, draw, cancelled)
- `startTime` (Date)
- `endTime` (Date)
- `timestamps`

### BetHistory
- `fightId` (ObjectId, ref: Fight)
- `userId` (ObjectId, ref: User)
- `betSide` (Enum: meron, wala)
- `amount` (Number)
- `payout` (Number)
- `status` (Enum: pending, won, lost, cancelled)
- `odds` (Number)
- `is_paid` (Boolean)
- `betCode` (String)
- `timestamps`

### GameEvent
- `eventName` (String, required)
- `eventDate` (Date)
- `location` (String)
- `status` (Enum: upcoming, ongoing, completed, cancelled)
- `createdBy` (ObjectId, ref: User)
- `timestamps`

### Runner
- `runnerId` (ObjectId, ref: User)
- `tellerId` (ObjectId, ref: User)
- `amount` (Number)
- `transactionType` (Enum: remit, topup)
- `status` (Enum: pending, processing, completed, cancelled)
- `timestamps`

## 🔌 Socket.IO Events

### Client Events

- `join-room` - Join a specific fight room
- `leave-room` - Leave a fight room
- `fight-update` - Send fight updates
- `bet-placed` - Send new bet notifications

### Server Events

- `fight-updated` - Broadcast fight updates to room
- `new-bet` - Broadcast new bet to room

## 👥 User Roles

The system supports the following user roles:

1. **admin** - Full system access
2. **cashinTeller** - Handle cash-in operations
3. **cashoutTeller** - Handle cash-out operations
4. **runner** - Mobile betting agents
5. **controller** - Fight management and control

## 📝 Notes

- All protected routes require a valid JWT token in the Authorization header
- Passwords are automatically hashed using bcrypt
- The system uses a 5% commission on total bets
- Odds are calculated automatically based on betting totals
- Real-time updates are broadcast to all connected clients in the same fight room

## 🤝 Support

For issues and questions, please contact the development team.

## 📄 License

ISC
