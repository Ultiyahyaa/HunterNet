# Backend Architecture

The HunterNet backend follows a layered architecture that separates responsibilities into distinct modules. Each folder has a single purpose, making the codebase easier to maintain, test, and extend.

```
Client
   │
   ▼
Routes
   │
   ▼
Controllers
   │
   ▼
Services
   │
   ▼
Repositories
   │
   ▼
PostgreSQL
```

Additional systems:

```
Middleware
   ├── Authentication
   ├── Validation
   ├── File Uploads
   └── Permissions

Sockets
   └── Real-time Events
```

---

## Folder Structure

### `config/`

Contains application configuration and shared utilities.

Examples include:

- PostgreSQL connection pool
- Environment configuration
- Shared constants
- Startup configuration

This folder should never contain business logic.

---

### `controllers/`

Controllers are responsible for handling HTTP requests.

Their responsibilities are limited to:

- Reading request parameters
- Calling the appropriate service
- Returning an HTTP response

Controllers should **not** contain database queries or complex business logic.

---

### `middleware/`

Middleware executes before requests reach controllers.

Typical middleware includes:

- Authentication
- Permission checks
- File uploads
- Request validation
- Rate limiting

Middleware should only prepare or reject requests—it should not perform application logic.

---

### `repositories/`

Repositories are the only layer that communicates directly with PostgreSQL.

Responsibilities include:

- SQL queries
- Inserts
- Updates
- Deletes
- Transactions

Repositories should never contain HTTP or socket logic.

---

### `routes/`

Routes define the API.

Their only responsibility is mapping endpoints to middleware and controllers.

Example:

```
Route
    ↓
Authentication
    ↓
Validation
    ↓
Controller
```

Routes should remain as small as possible.

---

### `services/`

Services contain the application's business logic.

This is where:

- Permissions are evaluated
- Data is processed
- Multiple repositories are combined
- Socket events are triggered
- Business rules are enforced

Most of the application's logic should live here.

---

### `sockets/`

Contains all Socket.IO functionality.

Responsibilities include:

- Event registration
- Room management
- Broadcasting events
- Live updates

Socket handlers should call services whenever business logic is required instead of duplicating code.

---

### `utils/`

Contains functions and files used repeatedly in the backend.

Things like:
- AppError Class
- Responses 
- Logic Helpers

Code and Functions that help simplify and standardize code segments is located here.

---

## Request Lifecycle

A typical API request follows this path:

```
HTTP Request
      │
      ▼
Route
      │
      ▼
Middleware
      │
      ▼
Controller
      │
      ▼
Service
      │
      ▼
Repository
      │
      ▼
PostgreSQL
      │
      ▼
Response
```

If real-time updates are needed:

```
Service
    │
    ▼
Socket Event
    │
    ▼
Connected Clients
```

---

## Design Principles

- **Routes** define endpoints.
- **Middleware** prepares requests.
- **Controllers** coordinate requests and responses.
- **Services** contain business logic.
- **Repositories** communicate with the database.
- **Sockets** handle real-time communication.
- **Config** provides shared application configuration.

Keeping each layer focused on a single responsibility makes HunterNet easier to understand, debug, and scale as new features are added.