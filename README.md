# Talpak Backend V2

Node.js + Express + MongoDB backend for event/fight management, betting, and runner transactions.

## Overview

- Runtime: `Node.js` (CommonJS)
- Framework: `Express`
- DB: `MongoDB` via `Mongoose`
- Auth: `JWT` bearer token
- Realtime: `Socket.IO`

## Setup

1. Install dependencies.
```bash
npm install
```
2. Create `.env` in project root.
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/talpakdb
JWT_SECRET=your_secure_jwt_secret_here
CLIENT_URL=http://localhost:3000
```
3. Run development server.
```bash
npm run dev
```

## Scripts

- `npm run dev` - run server with `nodemon`
- `npm run version:insert -- <version> <file> [changeLogsCSV] [isLatest]` - insert version via API script
- `npm run bethistory:backfill-tellerno` - backfill `bethistories.tellerNo` from users

## Authentication

- Protected routes require: `Authorization: Bearer <token>`
- JWT payload currently includes: `userId`, `username`, `tellerNo`, `role`

## Models

### `User` (`models/User.js`)

- `username`: `String`, required, unique
- `tellerNo`: `Number`, default `0`
- `password`: `String`, required, bcrypt-hashed by pre-save hook
- `role`: enum `admin | cashinTeller | cashoutTeller | runner | controller`, default `cashinTeller`
- `isActive`: `Boolean`, default `false`
- `credits`: `Number`, default `0`, min `0`
- timestamps enabled

### `GameEvent` (`models/GameEvent.js`)

- `eventName`: `String`, required
- `eventDate`: `Date`, required, default `Date.now`
- `location`: `String`
- `status`: enum `upcoming | ongoing | completed | cancelled`, default `upcoming`
- `createdBy`: `ObjectId(User)`, required
- timestamps enabled

### `Fight` (`models/Fight.js`)

- `eventId`: `ObjectId(GameEvent)`, required
- `fightNumber`: `Number`
- `meron`: `Number`, default `0` (stored scaled by setter/getter)
- `wala`: `Number`, default `0` (stored scaled by setter/getter)
- `createdBy`: `ObjectId(User)`, required
- `status`: enum `open | closed | completed | cancelled | waiting`, default `waiting`
- `winner`: enum `meron | wala | draw | cancelled`
- `startTime`: `Date`, default `Date.now`
- `endTime`: `Date`
- timestamps enabled
- unique index: `{ eventId: 1, fightNumber: 1 }`

### `BetHistory` (`models/BetHistory.js`)

- `fightId`: `ObjectId(Fight)`, required
- `userId`: `ObjectId(User)`, required
- `tellerNo`: `Number`, default `0`
- `betSide`: enum `meron | wala`, required
- `amount`: `Number`, required, min `0` (stored scaled by setter/getter)
- `payout`: `Number`, default `0` (stored scaled by setter/getter)
- `status`: enum `pending | won | lost | cancelled | draw`, default `pending`
- `odds`: `Number`, required, default `1`
- `is_paid`: `Boolean`, default `false`
- `betCode`: `String`, sparse
- timestamps enabled
- indexes: `{ fightId: 1, userId: 1 }`, `{ tellerNo: 1, fightId: 1 }`, `{ betCode: 1 } (sparse)`

### `Runner` (`models/Runner.js`)

- `eventId`: `ObjectId(GameEvent)`
- `runnerId`: `ObjectId(User)`
- `tellerId`: `ObjectId(User)`, required
- `tellerNo`: `Number`, default `0`
- `amount`: `Number`, required, min `0`
- `transactionType`: enum `remit | topup`, required
- `status`: enum `pending | processing | completed | cancelled`, default `pending`
- timestamps enabled
- indexes:
  - `{ runnerId: 1, createdAt: -1 }` (sparse)
  - `{ tellerId: 1, createdAt: -1 }`
  - `{ eventId: 1, tellerNo: 1, createdAt: -1 }`
  - `{ eventId: 1, tellerId: 1, transactionType: 1, status: 1 }`
  - `{ transactionType: 1 }`
  - `{ status: 1 }`

### `Version` (`models/Version.js`)

- `version`: `String`, required
- `file`: `String`, required
- `changeLogs`: `String[]`, default `[]`
- `isLatest`: `Boolean`, default `false`
- timestamps enabled

## API Routes

Base URL examples assume default server: `http://localhost:3000`.

### Auth Routes (`/api/auth`)

1. `POST /register`
- Auth: No
- Body:
  - `username` (required)
  - `password` (required)
  - `tellerNo` (optional)
  - `role` (optional)

2. `POST /login`
- Auth: No
- Body:
  - `username` (required)
  - `password` (required)

### User Routes (`/api/users`)

1. `GET /`
- Auth: Yes
- Query: none

2. `GET /:id`
- Auth: Yes
- Path params:
  - `id` user ObjectId

3. `GET /:id/credits`
- Auth: Yes
- Path params:
  - `id` user ObjectId

4. `POST /`
- Auth: Yes
- Body:
  - `username` (required)
  - `password` (required)
  - `tellerNo` (optional)
  - `role` (optional)

5. `PUT /:id`
- Auth: Yes
- Path params:
  - `id` user ObjectId
- Body:
  - `username` (optional)
  - `password` (optional)
  - `tellerNo` (optional)
  - `role` (optional)

6. `DELETE /:id`
- Auth: Yes
- Path params:
  - `id` user ObjectId

### Game Event Routes (`/api/game-events`)

1. `GET /`
- Auth: Yes

2. `GET /active`
- Auth: Yes

3. `POST /`
- Auth: Yes
- Body:
  - `eventName` (required)
  - `eventDate` (optional)
  - `location` (optional)

4. `PATCH /:id/activate`
- Auth: Yes
- Path params:
  - `id` event ObjectId

5. `PUT /:id`
- Auth: Yes
- Path params:
  - `id` event ObjectId
- Body:
  - `eventName` (optional)
  - `eventDate` (optional)
  - `location` (optional)
  - `status` (optional)

### Fight Routes (`/api/fights`)

1. `GET /event/:eventId`
- Auth: Yes
- Path params:
  - `eventId` event ObjectId

2. `GET /current/:eventId`
- Auth: Yes
- Path params:
  - `eventId` event ObjectId

3. `GET /:id`
- Auth: Yes
- Path params:
  - `id` fight ObjectId

4. `POST /`
- Auth: Yes
- Body:
  - `eventId` (required)
  - `meron` (optional)
  - `wala` (optional)

5. `PATCH /complete`
- Auth: Yes
- Body:
  - `eventId` (required)

6. `PATCH /:id/status`
- Auth: Yes
- Path params:
  - `id` fight ObjectId
- Body:
  - `status` (required)

7. `PATCH /declare-winner`
- Auth: Yes
- Body:
  - `fightId` (required)
  - `winner` (required): `meron | wala | draw | cancelled`
  - `status` (required): `completed | cancelled`

8. `PATCH /partial-state`
- Auth: Yes
- Body:
  - `side` (required): `MERON | WALA`
  - `isClosed` (required): `boolean`
  - `fightNo` (required): `number`

9. `GET /partial-state/:fightNo`
- Auth: Yes
- Path params:
  - `fightNo` number

10. `DELETE /partial-state/:fightNo`
- Auth: Yes
- Path params:
  - `fightNo` number

11. `GET /partial-state`
- Auth: Yes

### Bet History Routes (`/api/bet-history`)

1. `GET /`
- Auth: Yes
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)

2. `GET /:id`
- Auth: Yes
- Path params:
  - `id` bet ObjectId

3. `GET /code/:betCode`
- Auth: Yes
- Path params:
  - `betCode` string

4. `GET /fight/:fightId`
- Auth: Yes
- Path params:
  - `fightId` fight ObjectId
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)

5. `GET /user/:userId`
- Auth: Yes
- Path params:
  - `userId` user ObjectId
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)

6. `GET /user/:userId/event/:eventId`
- Auth: Yes
- Path params:
  - `userId` user ObjectId
  - `eventId` event ObjectId
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)

7. `GET /teller/active-event`
- Auth: Yes
- Uses:
  - `req.user.tellerNo` (or fallback from DB by `req.user.userId`)
  - active event where `status = ongoing`
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)

8. `POST /add`
- Auth: Yes
- Body:
  - `fightId` (required)
  - `betSide` (required): `meron | wala`
  - `amount` (required)
  - `odds` (optional, default `1`)
  - `bet_code` (optional)

9. `PATCH /:id/status`
- Auth: Yes
- Path params:
  - `id` bet ObjectId
- Body:
  - `status` (optional)
  - `payout` (optional)

10. `PATCH /:id/settle`
- Auth: Yes
- Path params:
  - `id` bet ObjectId
- Body: none

### Runner Routes (`/api/runners`)

1. `GET /items`
- Auth: Yes
- Query:
  - `eventId` (required)
  - `tellerNo` (required)

2. `GET /`
- Auth: Yes
- Query:
  - `status` (optional)
  - `transactionType` (optional)
  - `runnerId` (optional)
  - `tellerId` (optional)
  - `tellerNo` (optional)

3. `GET /runner/:runnerId`
- Auth: Yes
- Path params:
  - `runnerId` user ObjectId
- Query:
  - `status` (optional)
  - `transactionType` (optional)

4. `GET /teller/:tellerNo`
- Auth: Yes
- Path params:
  - `tellerNo` number
- Query:
  - `status` (optional)
  - `transactionType` (optional)

5. `GET /me/current-event`
- Auth: Yes
- Params/body: none
- Uses:
  - `req.user.tellerNo` (fallback from DB by `req.user.userId`)
  - currently active event (`status = ongoing`)

6. `POST /`
- Auth: Yes
- Body:
  - `amount` (required, > 0)
  - `transactionType` (required): `remit | topup`

7. `POST /topup`
- Auth: Yes
- Body:
  - `amount` (required, > 0)

8. `POST /remittance`
- Auth: Yes
- Body:
  - `amount` (required, > 0)

9. `PUT /assign/:transactionId`
- Auth: Yes
- Path params:
  - `transactionId` runner transaction ObjectId
- Body:
  - `runnerId` (required)

10. `GET /summary`
- Auth: Yes
- Query:
  - `tellerNo` (required)
  - `eventId` (required)

11. `GET /stats/:runnerId`
- Auth: Yes
- Path params:
  - `runnerId` user ObjectId

12. `GET /:id`
- Auth: Yes
- Path params:
  - `id` runner transaction ObjectId

### Guest Routes (`/api/guests`)

1. `GET /event/active`
- Auth: No

2. `GET /current/:eventId`
- Auth: No
- Path params:
  - `eventId` event ObjectId

### Version Routes (`/api/version`)

1. `POST /`
- Auth: No
- Body:
  - `version` (required)
  - `file` (required)
  - `changeLogs` (optional, array of strings)
  - `isLatest` (optional, boolean, default `true`)

2. `GET /latest`
- Auth: No

### Misc Route

1. `GET /api/protected`
- Auth: Yes
- Returns decoded JWT payload

## Socket Events

Common emitted events used across routes/services:
- `fight_update`
- `bet_added`
- `partial_state_update`
- `partial_state_cleared`

## Notes

- Money fields in several models use setters/getters that scale/format values.
- All route definitions are in `routes/*.js`.
- Model definitions are in `models/*.js`.
