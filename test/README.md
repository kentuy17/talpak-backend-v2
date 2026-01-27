# Socket.IO Test Client

This test client listens for Socket.IO events from the server.

## Prerequisites

- Make sure the backend server is running on `http://localhost:3000`
- Socket.IO server is initialized (it's already set up in `server.js`)

## Running the Test

Run the socket test client:

```bash
npm run test:socket
```

## What It Tests

The test client connects to the Socket.IO server and listens for the following events:

1. **bet_added** - Triggered when a new bet is placed via the `/api/bet-history/add` endpoint
2. **fight-updated** - Triggered when fight data is updated
3. **new-bet** - Triggered when a new bet is placed in a specific fight room

## Expected Output

When a bet is placed through the API, you should see output like:

```
🎉 New bet received:
Fight ID: 507f1f77bcf86cd799439011
User ID: 507f1f77bcf86cd799439012
Bet Side: meron
Amount: 1000.00
Odds: 1.5
Status: pending
Created At: 2024-01-17T10:30:00.000Z
------------------------
```

## How to Test

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the socket test client:
   ```bash
   npm run test:socket
   ```

3. Place a bet through the API (using Postman, curl, or another client):
   ```bash
   POST /api/bet-history/add
   Headers: Authorization: Bearer <your_token>
   Body: {
     "fightId": "<fight_id>",
     "betSide": "meron",
     "amount": 1000,
     "odds": 1.5
   }
   ```

4. You should see the bet details in the socket test client terminal
