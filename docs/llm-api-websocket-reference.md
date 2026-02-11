# Talpak Backend V2 — LLM API + WebSocket Reference

This reference is derived directly from route handlers, Mongoose schemas, and Socket.IO server code.

## Global API Notes

- Base URL prefix: `/api`
- JSON body parsing is enabled globally.
- Protected routes require `Authorization: Bearer <jwt>`.
- JWT payload shape from login/register: `{ userId, username }` and 24h expiry.
- ObjectId parameters are expected to be valid MongoDB ObjectIds unless otherwise stated.

## Domain Enumerations and Defaults

### User
- `role` enum: `admin | cashinTeller | cashoutTeller | runner | controller` (default `cashinTeller`)
- `tellerNo` default: `0`
- `credits` default: `0`
- `isActive` default: `false`

### GameEvent
- `status` enum: `upcoming | ongoing | completed | cancelled` (default `upcoming`)
- `eventDate` default: current date/time

### Fight
- `status` enum: `open | closed | completed | cancelled | waiting` (default `waiting`)
- `winner` enum: `meron | wala | draw | cancelled`
- `meron` default: `0`
- `wala` default: `0`
- `startTime` default: current date/time

### BetHistory
- `betSide` enum: `meron | wala`
- `status` enum: `pending | won | lost | cancelled | draw` (default `pending`)
- `odds` default: `1`
- `payout` default: `0`
- `is_paid` default: `false`

### Runner transaction
- `transactionType` enum: `remit | topup`
- `status` enum: `pending | processing | completed | cancelled` (default `pending`)

---

## Authentication Endpoints

### `POST /api/auth/register`
**Auth:** Public  
**Body params:**
- `username` (required, string, unique)
- `password` (required, string)
- `tellerNo` (optional, number, default `0`)
- `role` (optional enum; default `cashinTeller`)

**Success sample (201):**
```json
{
  "message": "User registered successfully",
  "token": "<jwt>",
  "user": {
    "id": "65f1d0f0a8f5a54d3c2f90a1",
    "username": "alice",
    "email": 1001,
    "role": "cashinTeller"
  }
}
```

**Error sample (400):**
```json
{ "message": "User already exists" }
```

### `POST /api/auth/login`
**Auth:** Public  
**Body params:**
- `username` (required, string)
- `password` (required, string)

**Success sample (200):**
```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "user": {
    "id": "65f1d0f0a8f5a54d3c2f90a1",
    "username": "alice",
    "tellerNo": 1001,
    "role": "cashinTeller",
    "credits": 0
  }
}
```

**Error sample (401):**
```json
{ "message": "Invalid credentials" }
```

---

## Protected Utility Endpoint

### `GET /api/protected`
**Auth:** Required  
**Response sample (200):**
```json
{
  "message": "Access granted to protected route",
  "user": {
    "userId": "65f1d0f0a8f5a54d3c2f90a1",
    "username": "alice",
    "iat": 1736500000,
    "exp": 1736586400
  }
}
```

---

## Users (`/api/users`) — all protected

### `GET /api/users`
**Query params:** none

**Success sample (200):**
```json
[
  {
    "_id": "65f1d0f0a8f5a54d3c2f90a1",
    "username": "alice",
    "tellerNo": 1001,
    "role": "cashinTeller",
    "isActive": false,
    "credits": 0,
    "createdAt": "2026-01-08T18:00:00.000Z",
    "updatedAt": "2026-01-08T18:00:00.000Z"
  }
]
```

### `GET /api/users/:id`
**Path params:** `id` (required ObjectId)

**Success sample (200):**
```json
{
  "_id": "65f1d0f0a8f5a54d3c2f90a1",
  "username": "alice",
  "tellerNo": 1001,
  "role": "cashinTeller",
  "isActive": false,
  "credits": 0,
  "createdAt": "2026-01-08T18:00:00.000Z",
  "updatedAt": "2026-01-08T18:00:00.000Z"
}
```

**Error sample (404):**
```json
{ "message": "User not found" }
```

### `GET /api/users/:id/credits`
**Path params:** `id` (required ObjectId)

**Success sample (200):**
```json
{ "credits": 1500.5 }
```

### `POST /api/users`
**Body params:**
- `username` (required)
- `password` (required)
- `tellerNo` (optional, default `0`)
- `role` (optional enum, default `cashinTeller`)

**Success sample (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "65f1d0f0a8f5a54d3c2f90a2",
    "username": "bob",
    "tellerNo": 1002,
    "role": "cashoutTeller"
  }
}
```

### `PUT /api/users/:id`
**Path params:** `id` (required ObjectId)  
**Body params:**
- `username` (optional)
- `password` (optional; only updated when provided)
- `tellerNo` (optional)
- `role` (optional enum)

**Success sample (200):**
```json
{
  "message": "User updated successfully",
  "user": {
    "_id": "65f1d0f0a8f5a54d3c2f90a2",
    "username": "bob-updated",
    "tellerNo": 1002,
    "role": "cashoutTeller",
    "isActive": false,
    "credits": 0,
    "createdAt": "2026-01-08T18:00:00.000Z",
    "updatedAt": "2026-01-08T18:30:00.000Z"
  }
}
```

### `DELETE /api/users/:id`
**Path params:** `id` (required ObjectId)

**Success sample (200):**
```json
{ "message": "User deleted successfully" }
```

---

## Game Events (`/api/game-events`) — all protected

### `GET /api/game-events`
Returns all events sorted by `eventDate` desc.

### `GET /api/game-events/active`
Returns one event where `status = ongoing`.

**404 sample:**
```json
{ "message": "No active event found" }
```

### `POST /api/game-events`
**Body params:**
- `eventName` (required, string)
- `eventDate` (optional, date; default now)
- `location` (optional, string)

`createdBy` is taken from JWT `userId`.

**Success sample (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "_id": "65f1d0f0a8f5a54d3c2f90b1",
    "eventName": "Saturday Derby",
    "eventDate": "2026-02-11T08:00:00.000Z",
    "location": "Arena 1",
    "status": "upcoming",
    "createdBy": "65f1d0f0a8f5a54d3c2f90a1",
    "createdAt": "2026-02-11T07:55:00.000Z",
    "updatedAt": "2026-02-11T07:55:00.000Z"
  }
}
```

### `PATCH /api/game-events/:id/activate`
Sets all ongoing events to completed, then sets target event to ongoing.

**Success sample (200):**
```json
{
  "message": "Event activated successfully",
  "event": {
    "_id": "65f1d0f0a8f5a54d3c2f90b1",
    "eventName": "Saturday Derby",
    "status": "ongoing"
  }
}
```

### `PUT /api/game-events/:id`
**Body params:** `eventName`, `eventDate`, `location`, `status` (status enum optional)

**Success sample (200):**
```json
{
  "message": "Event updated successfully",
  "event": {
    "_id": "65f1d0f0a8f5a54d3c2f90b1",
    "eventName": "Saturday Derby Finals",
    "eventDate": "2026-02-11T09:00:00.000Z",
    "location": "Arena 2",
    "status": "ongoing"
  }
}
```

---

## Fights (`/api/fights`) — all protected

### `GET /api/fights/event/:eventId`
List fights for event, sorted `fightNumber ASC`.

### `GET /api/fights/current/:eventId`
Returns latest fight by highest `fightNumber`.

### `GET /api/fights/:id`
Returns fight by id with populated `eventId`.

### `POST /api/fights`
**Body params:**
- `eventId` (required)
- `meron` (optional, number, default `0`)
- `wala` (optional, number, default `0`)

**Rules:**
- Previous fight in event must be `completed` before creating next.
- `fightNumber` auto-increments by event.
- New fight status defaults to `waiting`.
- Emits socket event `fight_update`.

**Success sample (201):**
```json
{
  "message": "Fight created successfully",
  "fight": {
    "_id": "65f1d0f0a8f5a54d3c2f90c1",
    "eventId": "65f1d0f0a8f5a54d3c2f90b1",
    "fightNumber": 3,
    "meron": "0.00",
    "wala": "0.00",
    "status": "waiting",
    "createdBy": "65f1d0f0a8f5a54d3c2f90a1"
  }
}
```

### `PATCH /api/fights/complete`
**Body params:** `eventId` (required)

Completes current (latest) fight for event unless already completed.

### `PATCH /api/fights/:id/status`
**Body params:**
- `status` (required enum: `open|closed|completed|cancelled|waiting`)

**Rules:**
- If status is `closed`, backend runs fight closure processing and emits `fight_update` with processed fight.
- Otherwise emits `fight_update` with updated fight.

### `PATCH /api/fights/declare-winner`
**Body params:**
- `fightId` (required)
- `winner` (required enum: `meron|wala|draw|cancelled`)
- `status` (required enum: `completed|cancelled`)

**Rules:**
- Updates existing fight winner and end time.
- Processes bets for the fight.
- Auto-creates next fight (`status=waiting`, `meron=0`, `wala=0`).
- Emits 2 socket `fight_update` events (completed fight and next fight payload).

**Success sample (200):**
```json
{
  "message": "Fight winner declared successfully and next fight created",
  "completedFight": {
    "_id": "65f1d0f0a8f5a54d3c2f90c1",
    "winner": "meron",
    "status": "completed",
    "endTime": "2026-02-11T09:30:00.000Z"
  },
  "nextFight": {
    "_id": "65f1d0f0a8f5a54d3c2f90c2",
    "fightNumber": 4,
    "status": "waiting",
    "meron": "0.00",
    "wala": "0.00"
  }
}
```

### Partial State Endpoints

#### `PATCH /api/fights/partial-state`
**Body params:**
- `side` (required enum: `MERON|WALA`)
- `isClosed` (required boolean)
- `fightNo` (required number)

**Rules:** updates in-memory partial state and emits `partial_state_update`.

#### `GET /api/fights/partial-state/:fightNo`
Returns current partial state for fight number.

**Success sample (200):**
```json
{
  "fightNo": 4,
  "meron": true,
  "wala": false
}
```

#### `DELETE /api/fights/partial-state/:fightNo`
Clears partial state for fight and emits `partial_state_cleared` when a state existed.

#### `GET /api/fights/partial-state`
Returns all in-memory partial states.

---

## Bet History (`/api/bet-history`) — all protected

### `GET /api/bet-history`
**Query params:**
- `page` (optional, number, default `1`)
- `limit` (optional, number, default `10`)

**Success sample (200):**
```json
{
  "bets": [
    {
      "_id": "65f1d0f0a8f5a54d3c2f90d1",
      "fightId": {
        "_id": "65f1d0f0a8f5a54d3c2f90c1",
        "fightNumber": 3,
        "meron": "1000.00",
        "wala": "800.00",
        "status": "open"
      },
      "userId": {
        "_id": "65f1d0f0a8f5a54d3c2f90a1",
        "username": "alice",
        "tellerNo": 1001,
        "role": "cashinTeller"
      },
      "betSide": "meron",
      "amount": "200.00",
      "payout": "0.00",
      "status": "pending",
      "odds": 1,
      "is_paid": false,
      "betCode": "BET-001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### `GET /api/bet-history/:id`
Get single bet by id.

### `GET /api/bet-history/code/:betCode`
Get single bet by `betCode`.

### `GET /api/bet-history/fight/:fightId`
Paginated bets by fight.

### `GET /api/bet-history/user/:userId`
Paginated bets by user.

### `GET /api/bet-history/user/:userId/event/:eventId`
Paginated bets by user limited to fights in event.

### `POST /api/bet-history/add`
**Body params:**
- `fightId` (required)
- `betSide` (required enum: `meron|wala`)
- `amount` (required number > 0)
- `odds` (optional number, default `1`)
- `bet_code` (optional string; mapped to `betCode`)

**Rules:**
- Fight must exist and `fight.status === open`.
- Selected side must not be partially closed.
- Auth user must exist.
- Validates credit sufficiency and updates credits.
- Emits `bet_added` (global emit).

**Success sample (201):**
```json
{
  "message": "Bet placed successfully",
  "bet": {
    "_id": "65f1d0f0a8f5a54d3c2f90d2",
    "fightId": "65f1d0f0a8f5a54d3c2f90c1",
    "userId": "65f1d0f0a8f5a54d3c2f90a1",
    "betSide": "meron",
    "amount": "300.00",
    "payout": "0.00",
    "status": "pending",
    "odds": 1.75,
    "is_paid": false,
    "betCode": "B-7782"
  },
  "remainingCredits": 1200.5
}
```

**Insufficient credits sample (400):**
```json
{
  "message": "Insufficient credits",
  "currentCredits": 50,
  "requiredCredits": 300
}
```

### `PATCH /api/bet-history/:id/status`
**Body params:**
- `status` (required enum: `pending|won|lost|cancelled|draw`)
- `payout` (optional number, default stays current)

### `PATCH /api/bet-history/:id/settle`
No body required.

**Rules:**
- Bet must exist.
- Bet `status` must be `won` or `draw`.
- `is_paid` must be false.
- Sets `is_paid = true`.

---

## Runner Transactions (`/api/runners`) — all protected

### `GET /api/runners/items`
**Query params:**
- `eventId` (required ObjectId)
- `tellerNo` (required number)

Returns bet-history items for a teller in a given event.

### `GET /api/runners`
**Query filters (all optional):**
- `status` enum `pending|processing|completed|cancelled`
- `transactionType` enum `remit|topup`
- `runnerId` ObjectId
- `tellerId` ObjectId
- `tellerNo` number (resolved to tellerId)

**Success sample (200):**
```json
{
  "transactions": [
    {
      "_id": "65f1d0f0a8f5a54d3c2f90e1",
      "eventId": "65f1d0f0a8f5a54d3c2f90b1",
      "runnerId": null,
      "amount": 500,
      "transactionType": "remit",
      "status": "completed",
      "createdAt": "2026-02-11T08:10:00.000Z",
      "updatedAt": "2026-02-11T08:10:00.000Z",
      "tellerNo": 1001
    }
  ]
}
```

### `GET /api/runners/runner/:runnerId`
Optional query: `status`, `transactionType`.

### `GET /api/runners/teller/:tellerNo`
Optional query: `status`, `transactionType`.

### `POST /api/runners`
**Body params:**
- `amount` (required number > 0)
- `transactionType` (required enum `remit|topup`)

**Rules:**
- Creates transaction with `runnerId = null`, `tellerId = req.user.userId`, `status = processing`.
- `eventId` uses current ongoing event, else latest event, else null.

### `POST /api/runners/topup`
**Body params:** `amount` (required > 0)

**Rules:**
- Auth user role must be one of `cashinTeller|cashoutTeller|admin`.
- Increments teller credits.
- Creates transaction (`transactionType=topup`, saved as completed).

### `POST /api/runners/remittance`
**Body params:** `amount` (required > 0)

**Rules:**
- Auth user role must be one of `cashinTeller|cashoutTeller|admin`.
- Requires sufficient credits.
- Deducts teller credits.
- Creates transaction (`transactionType=remit`, saved as completed).

### `PUT /api/runners/assign/:transactionId`
**Body params:** `runnerId` (required ObjectId)

**Rules:**
- Transaction must exist, have null `runnerId`, and `status === pending`.
- Runner must exist.
- Updates to `runnerId` and `status = processing`.

### `GET /api/runners/summary`
**Query params:**
- `tellerNo` (required number)
- `eventId` (required ObjectId)

Returns `totalTopup` and `totalRemittance` for completed records.

### `GET /api/runners/stats/:runnerId`
Returns transaction counts and totals by status/type for runner.

### `GET /api/runners/:id`
Returns a single transaction with populated runner/teller.

---

## Guest Endpoints (`/api/guests`) — public

### `GET /api/guests/event/active`
Returns currently ongoing event.

### `GET /api/guests/current/:eventId`
Returns latest fight for event by highest `fightNumber`.

---

## WebSocket (Socket.IO) Reference

### Server initialization
- CORS: `origin=*`, methods `GET,POST`, credentials true
- Transports: `websocket`, `polling`
- `allowEIO3: true`
- Auth middleware reads `socket.handshake.auth.token` but currently allows all connections.

### Client → Server events

#### `join-room`
**Payload:** `roomId` (string)
**Effect:** socket joins room.

#### `leave-room`
**Payload:** `roomId` (string)
**Effect:** socket leaves room.

#### `fight-update`
**Payload sample:**
```json
{ "fightId": "fight-123", "status": "open", "meron": 1000, "wala": 800 }
```
**Effect:** server relays to room as `fight-updated`.

#### `bet-placed`
**Payload sample:**
```json
{ "fightId": "fight-123", "amount": 200, "betSide": "meron", "userId": "u1" }
```
**Effect:** server relays to room as `new-bet`.

#### `bet_added`
**Payload sample:**
```json
{ "fightId": "fight-123", "amount": 300, "betSide": "wala", "userId": "u2" }
```
**Effect:** server relays to room as `new-bet`.

### Server → Client events

#### `fight-updated`
Emitted to a room in response to client `fight-update`.

#### `new-bet`
Emitted to a room in response to client `bet-placed` or `bet_added`.

#### `fight_update`
Global broadcast from HTTP routes when fights are created/updated/closed/winner-declared.

**Payload sample:**
```json
{
  "_id": "65f1d0f0a8f5a54d3c2f90c1",
  "eventId": "65f1d0f0a8f5a54d3c2f90b1",
  "fightNumber": 3,
  "status": "closed",
  "winner": "meron",
  "meron": "1200.00",
  "wala": "900.00"
}
```

#### `bet_added`
Global broadcast from `POST /api/bet-history/add` after bet save.

**Payload sample:**
```json
{
  "_id": "65f1d0f0a8f5a54d3c2f90d2",
  "fightId": "65f1d0f0a8f5a54d3c2f90c1",
  "userId": "65f1d0f0a8f5a54d3c2f90a1",
  "betSide": "meron",
  "amount": "300.00",
  "status": "pending",
  "odds": 1.75
}
```

#### `partial_state_update`
Global broadcast from `PATCH /api/fights/partial-state`.

**Payload sample:**
```json
{
  "fightNo": 4,
  "side": "MERON",
  "isClosed": true,
  "timestamp": "2026-02-11T09:20:00.000Z"
}
```

#### `partial_state_cleared`
Global broadcast from `DELETE /api/fights/partial-state/:fightNo`.

**Payload sample:**
```json
{
  "fightNo": 4,
  "timestamp": "2026-02-11T09:25:00.000Z"
}
```

#### `disconnect`
Triggered by Socket.IO when client disconnects.

---

## Important Implementation Notes for LLM Consumers

- `POST /api/bet-history/add` appears to increase user credits with `$inc: { credits: amount }` in the code path, despite checking for sufficient credits first. Treat this as implementation behavior, not intended betting economics.
- Money fields use model getters/setters; some responses expose stringified 2-decimal values (`"300.00"`) while others are numeric.
- Route-level auth is broad (`router.use(authMiddleware)`) with no per-role authorization checks in handlers.
