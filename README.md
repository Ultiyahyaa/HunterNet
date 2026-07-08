# HunterNet

> *"Reading doesn't make you an expert."*
> — Witness1

HunterNet is a realtime underground communication platform inspired by the legendary **hunter-net.org** from the World of Darkness universe created by White Wolf.

Built as a modern interpretation of the hidden network used by the Imbued, HunterNet combines encrypted communication, anonymous identities, live chat systems, private rooms, message boards, and administrative moderation into a dark web–style social platform designed for hunters operating in the shadows.

---

# Features

* Realtime global chat system
* Private direct messaging
* Room-based communication channels
* Thread boards and discussion systems
* User authentication and role management
* Admin dashboards and moderation tools
* Socket-powered live updates
* Relative timestamps and live activity
* Retro hacker-inspired interface
* Anonymous hunter-style identities

---

# Inspiration

This project is heavily inspired by the original **hunter-net.org** from *Hunter: The Reckoning*, part of the World of Darkness setting by White Wolf Publishing.

In the lore, Hunter-Net was:

* A hidden network accessible only to hunters
* Protected by mysterious entities known as the Messengers
* Used to share sightings, warnings, archives, and survival information
* Structured through chatrooms, mailing lists, and creed-specific forums
* Designed around anonymity, operational security, and survival

The original network emphasized:

1. Post only minimal information about yourself.
2. Do not abuse or threaten other hunters.
3. Hunter-Net is only a tool.
4. Reading doesn't make you an expert.

This project attempts to modernize that concept while preserving the atmosphere of paranoia, secrecy, and underground collaboration.

---

# Tech Stack

## Frontend

* HTML
* CSS
* JavaScript

## Backend

* Node.js
* Express.js
* Socket.IO
* Multer

## Database

* PostgreSQL

## Authentication

* JWT-based authentication
* Role-based access control

---

# Realtime Systems

HunterNet uses Socket.IO to power:

* Live global chat
* Instant room updates
* Realtime DMs
* Presence tracking
* Typing indicators
* Live moderation events

---

# Design Philosophy

HunterNet is intentionally designed with:

* Terminal-inspired visuals
* Dark cyberpunk aesthetics
* Minimalist layouts
* Fast communication systems
* Functional interfaces over modern social media styling

The platform is meant to feel like:

* A forgotten underground network
* An encrypted conspiracy board
* A system built by paranoid survivors
* Early-2000s internet merged with modern realtime infrastructure

---

# Security Philosophy

Operational security is a core part of the project design.

Users are encouraged to:

* Avoid personal information
* Use aliases
* Treat the platform as compromised by default
* Separate online identity from real-world identity

Just like the original lore.

---

# Planned Features

* Hunter symbol/tag systems
* File drops and evidence archives
* Anonymous reports
* Temporary burner accounts
* Invite-only hidden channels
* Reputation and trust systems
* Dark-web inspired routing themes
* Multi-server federation

---

# Repository Setup

## Clone the Repository

```bash
git clone https://github.com/Ultiyahyaa/HunterNet.git
```

```bash
cd HunterNet
```

---

## Install Dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
DB_USER = postgres                  [postgres is default, change if using a different user]
DB_HOST = localhost                 [localhost is default, change if nessessary]
DB_NAME = {INSERT DB NAME}
DB_PASSWORD = {INSERT DB PASSWORD}
DB_PORT = 5432                      [5432 is default, change if nessessary]

SESSION_SECRET = {INSERT KEY}       [Never Reveal this to others, add it to your .gitignore]
```

---

## Git Ignore

```gitignore
/.env               [Obvious]
/Public/uploads     [Prevent chat upload images from popping up in commit tab]
```

---

# PostgreSQL Setup 

HunterNet requires a PostgreSQL database.

## 1. Create Database

```sql
CREATE DATABASE HunterNet;
```

---

## 2. Import Schema [NOT AVAILABLE AS OF CURRENT]

The full database schema is located at:

```
Server/database/schema.sql
```

### Run schema:

```bash
psql -U <insert-user> -d <insert-db-name> -f Server/database/schema.sql
```

---

## 3. (Optional) Verify Tables

You should see core tables like:

* users
* threads
* posts
* boards
* rooms
* messages

---

# Running the App

```bash
npm start
```

---

# Render Deployment

* Create a **Web Service** from this repo
* Add a **PostgreSQL database**
* Set environment variables
* Start command:

  ```bash
  npm start
  ```
* Ensure **WebSockets are enabled**

---

# Project Structure

```
HunterNet/
├── Public/        # Frontend (HTML/CSS/JS)
├── Server/        # Backend (Express + Socket.IO)
│   ├── database/  # DB connection + schema
│   ├── routes/    # API endpoints
│   ├── sockets/   # realtime systems
│   └── server.js
├── .env
├── package.json
└── README.md
```

---

# Disclaimer

HunterNet is a fan-inspired project and is not affiliated with White Wolf, Paradox Interactive, or World of Darkness.

All original lore, terminology, and concepts related to Hunter: The Reckoning belong to their respective owners.

This project exists as a creative homage to one of the most unique fictional internet communities ever written.

---

# Final Transmission

> *"The monsters are real."*

Stay vigilant.
