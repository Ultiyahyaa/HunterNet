# HunterNet Backend Development Guide

This document outlines the conventions used throughout the HunterNet backend. Following these guidelines keeps the codebase consistent and makes new features easier to maintain.

---

# Development Flow

Almost every feature follows the same pattern:

```
Route
    ↓
Middleware
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Each layer has one responsibility.

---

# Routes

**Purpose:** Define API endpoints.

Routes should only:

- Register endpoints
- Apply middleware
- Call controllers

### Good

```js
router.post(
    "/send",
    authRequired,
    uploadImages,
    messagesController.sendMessage
);
```

### Bad

```js
router.post("/send", async (req, res) => {
    const result = await pool.query(...);
    ...
});
```

Database queries and business logic should never exist inside routes.

---

# Controllers

**Purpose:** Handle HTTP communication.

Controllers should:

- Read request parameters
- Validate required inputs (basic validation)
- Call services
- Return responses

Controllers should **not**:

- Write SQL
- Contain business logic
- Emit socket events directly

### Good

```js
const result = await messagesService.send(req.user.id, req.body);

res.json(result);
```

---

# Services

**Purpose:** Business logic.

Services are where application behavior belongs.

Examples:

- Creating threads
- Sending messages
- Pinning content
- Permission checks
- Combining multiple repositories
- Emitting socket events

Services may call multiple repositories.

Example:

```
Create Thread

Create Thread
      │
      ├── Create thread
      ├── Save attachments
      ├── Update statistics
      └── Broadcast socket event
```

If a feature requires thinking, it probably belongs in a service.

---

# Repositories

**Purpose:** Database access.

Repositories are responsible for:

- SELECT
- INSERT
- UPDATE
- DELETE
- Transactions

Repositories should not know anything about:

- Express
- req/res
- Socket.IO

### Good

```js
await threadRepository.create(data);
```

### Bad

```js
res.status(200).json(...);
```

Repositories should never return HTTP responses.

---

# Middleware

Middleware prepares requests before they reach controllers.

Examples:

- Authentication
- Admin permissions
- File uploads
- Validation
- Rate limiting

Middleware should either:

- Continue the request

```js
next();
```

or reject it.

```js
return res.status(403).json(...);
```

---

# Sockets

Sockets handle real-time communication.

They should:

- Join rooms
- Leave rooms
- Broadcast events
- Listen for client events

Avoid duplicating business logic inside socket handlers.

Instead:

```
Socket
   │
   ▼
Service
```

not

```
Socket
   │
   ▼
SQL
```

---

# Config

The `config` directory stores shared application resources.

Examples:

- Database connection
- Environment configuration
- Constants
- Utility configuration

No feature-specific logic belongs here.

---

# General Principles

## Keep layers separated

Avoid skipping layers.

Instead of:

```
Route
    │
    ▼
Database
```

use:

```
Route
    ▼
Controller
    ▼
Service
    ▼
Repository
```

---

## One responsibility per function

Functions should do one thing well.

Good:

```text
createThread()
saveAttachments()
broadcastThreadCreated()
```

Instead of:

```text
createEverything()
```

---

## Reuse services

If two APIs perform similar work, reuse the existing service rather than duplicating logic.

---

## Repository ownership

Every SQL query should have exactly one home.

Avoid writing the same query in multiple places.

---

## Keep controllers thin

A controller should generally be readable in under a minute.

If it starts growing, move logic into a service.

---

# Adding a New API

When creating a new endpoint:

1. Add the route.
2. Create or update the controller.
3. Add the business logic to a service.
4. Add database queries to a repository.
5. Emit socket events if real-time updates are needed.
6. Test the endpoint.

---

# Adding a New Database Query

Ask yourself:

**Does this query belong to an existing repository?**

- Yes → Add it there.
- No → Create a new repository.

Never place SQL inside controllers or services.

---

# Adding a New Socket Event

1. Register the event.
2. Call the appropriate service.
3. Broadcast updates.
4. Keep socket handlers lightweight.

---

# Philosophy

HunterNet follows a layered architecture where every component has a single responsibility.

```
Routes
    ↓
Controllers
    ↓
Services
    ↓
Repositories
    ↓
Database
```

Keeping these layers independent makes the backend easier to understand, easier to test, and easier to scale as the project grows.