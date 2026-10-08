# Event Registration System API

A scalable and secure backend RESTful API for an **Event Registration System** built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**.

---

## 📑 Table of Contents
- [Features & Business Rules](#-features--business-rules)
- [Folder Structure](#-folder-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Seeding](#database-seeding)
  - [Running the Server](#running-the-server)
- [API Endpoints](#-api-endpoints)
  - [Authentication](#1-authentication)
  - [Events](#2-events)
  - [Registrations](#3-registrations)
- [Standard Response Format](#-standard-response-format)
- [Postman & Thunder Client Testing](#-postman--thunder-client-testing)
- [Error Handling & Validation](#-error-handling--validation)

---

## 🚀 Features & Business Rules

1. **Role-Based Access Control (RBAC)**:
   - `user`: Browse events, register for available events, view and cancel their own registrations.
   - `organizer`: Full access plus creating, updating, deleting their own events, and viewing attendee rosters.
2. **Double Registration Prevention**:
   - Compound unique index `{ user: 1, event: 1 }` in MongoDB ensures duplicate registrations cannot exist.
   - System checks prevent a user from registering twice for the same event while an active registration is in place.
   - Re-registration after cancellation re-activates the seat cleanly without database key collisions.
3. **Capacity Management & Real-time Seat Counting**:
   - Blocks registrations when `activeRegistrations >= capacity`.
   - Dynamic real-time calculation of `remainingSeats` and `registeredCount` on both list and detail endpoints.
   - Cancelling a registration immediately frees up a seat for others.
   - Organizers cannot downsize an event capacity below the current count of active attendees.
4. **Date Validation**:
   - Registrations are blocked if the event date has already passed.
   - Creating/updating an event requires a future date.
5. **Secure Authentication & Validation**:
   - Password hashing with `bcryptjs` (salt rounds: 10).
   - Signed JSON Web Tokens (JWT) with configurable expiration.
   - Centralized validation via `express-validator` with clear field-level feedback.
   - Centralized error handler capturing Mongoose CastErrors, duplicate keys, JWT errors, and 404s.

---

## 📁 Folder Structure

```
├── config/
│   └── db.js                      # MongoDB Mongoose connection
├── controllers/
│   ├── authController.js          # Auth logic (register, login, me)
│   ├── eventController.js         # Event CRUD & aggregation queries
│   └── registrationController.js  # Registration, cancellation, attendee roster
├── middleware/
│   ├── auth.js                    # JWT verify (protect) & role authorization (authorizeRoles)
│   ├── error.js                   # Centralized error handler & 404 router
│   └── validator.js               # Express-validator error handler middleware
├── models/
│   ├── Event.js                   # Event schema & text search indexes
│   ├── Registration.js            # Registration schema & unique compound index
│   └── User.js                    # User schema, bcrypt hook & JWT helper
├── routes/
│   ├── authRoutes.js              # /api/auth routes
│   ├── eventRoutes.js             # /api/events routes
│   └── registrationRoutes.js      # /api/registrations routes
├── utils/
│   └── apiResponse.js             # Standardized { success, message, data } builder
├── validators/
│   ├── authValidator.js           # Auth input validation rules
│   ├── eventValidator.js          # Event input validation rules
│   └── registrationValidator.js   # Parameter ID validation rules
├── .env.example                   # Environment configuration template
├── package.json                   # Dependencies and scripts
├── postman_collection.json        # Postman / Thunder Client collection
├── seed.js                        # Database seeder with sample accounts & events
├── server.js                      # Express application entry point
└── README.md                      # Documentation
```

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Security**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS (`cors`)
- **Validation**: `express-validator`
- **Environment**: `dotenv`
- **Logging**: `morgan`

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI.

### Installation

1. Navigate to the project root:
   ```bash
   cd "Event Registration System"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review or modify `.env`:
```ini
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/event_registration_db
JWT_SECRET=supersecret_jwt_key_event_reg_2026_replace_in_prod
JWT_EXPIRE=7d
NODE_ENV=development
```

### Database Seeding

Populate the database with a pre-configured organizer, a sample regular user, and 3 realistic upcoming events:

```bash
npm run seed
```

**Seed Credentials**:
- **Organizer**:
  - Email: `organizer@eventhub.com`
  - Password: `organizer123`
  - Role: `organizer`
- **Attendee**:
  - Email: `alex.mercer@example.com`
  - Password: `user123`
  - Role: `user`

### Running the Server

Start development server (with nodemon):
```bash
npm run dev
```

Or start in standard production mode:
```bash
npm start
```

Base API URL: `http://localhost:5000`

---

## 📡 API Endpoints

### 1. Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user or organizer |
| `POST` | `/api/auth/login` | Public | Login with email & password, returns JWT |
| `GET` | `/api/auth/me` | Logged In | Get profile of logged-in user |

#### Register Payload (`POST /api/auth/register`):
```json
{
  "name": "Sarah Connor",
  "email": "sarah@example.com",
  "password": "password123",
  "role": "user" // or "organizer" (defaults to "user")
}
```

#### Login Payload (`POST /api/auth/login`):
```json
{
  "email": "sarah@example.com",
  "password": "password123"
}
```

---

### 2. Events

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | List all events (supports `?search=`, `?page=`, `?limit=`) |
| `GET` | `/api/events/:id` | Public | Get event details + remaining seats |
| `POST` | `/api/events` | Organizer | Create a new event |
| `PUT` | `/api/events/:id` | Organizer (Owner) | Update event details |
| `DELETE` | `/api/events/:id` | Organizer (Owner) | Delete event and its registrations |

#### Create Event Payload (`POST /api/events`):
*Requires `Authorization: Bearer <organizer_token>`*
```json
{
  "title": "Global AI & Cloud Summit 2026",
  "description": "Deep dive into generative AI, LLM fine-tuning, and scalable architectures.",
  "date": "2026-11-15",
  "time": "09:30 AM",
  "location": "Moscone Center West, San Francisco, CA",
  "capacity": 100
}
```

---

### 3. Registrations

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/events/:id/register` | Logged In | Register logged-in user for an event |
| `GET` | `/api/registrations/my` | Logged In | View my registrations with populated event info |
| `PATCH` | `/api/registrations/:id/cancel` | Logged In | Cancel my own registration (frees up seat) |
| `GET` | `/api/events/:id/registrations` | Organizer (Owner) | View attendee list for event |

---

## 📦 Standard Response Format

All responses follow a predictable JSON structure:

### Successful Response (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "message": "Registration successful!",
  "data": {
    "registration": {
      "_id": "67a5...",
      "status": "registered",
      "registeredAt": "2026-10-07T18:00:00.000Z",
      "user": {
        "_id": "67a5...",
        "name": "Alex Mercer",
        "email": "alex.mercer@example.com"
      },
      "event": {
        "_id": "67a5...",
        "title": "Global AI & NextGen Cloud Summit 2026",
        "capacity": 150
      }
    },
    "remainingSeats": 149
  }
}
```

### Error Response (`400 Bad Request` / `401 Unauthorized` / `403 Forbidden` / `404 Not Found`):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "capacity",
      "message": "Capacity must be an integer of at least 1"
    }
  ]
}
```

---

## 🧪 Postman & Thunder Client Testing

An automated request collection file is provided at:
[`postman_collection.json`](./postman_collection.json)

### How to use:
1. Open **Postman** or the **Thunder Client** VS Code extension.
2. Click **Import** and select `postman_collection.json`.
3. Set the `baseUrl` collection variable (default: `http://localhost:5000`).
4. Execute `Login as Organizer` or `Login as Regular User`:
   - Post-response scripts automatically store `userToken` and `organizerToken` in your environment.
   - You can immediately test protected routes without manually copying tokens.

---

## 🛡️ Error Handling & Validation

- **Centralized Error Handler**: Captures unhandled exceptions, MongoDB cast errors, duplicate keys, and malformed JSON.
- **Strict Parameter Check**: All route IDs (`:id`) validate MongoDB ObjectId formatting before reaching controllers.
- **Graceful Shutdown**: Unhandled rejections are logged and server closes connections cleanly.
