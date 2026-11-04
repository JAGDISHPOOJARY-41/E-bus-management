# 🚌 Wayfinder — E-Bus Management & Live Tracking System

A full-stack intelligent transit management and real-time bus tracking platform built with **Node.js**, **Express.js**, **MongoDB**, and **Leaflet.js**. The system provides dedicated workflows and dashboards for commuters, bus drivers, and transit administrators.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Project Architecture & Structure](#project-architecture--structure)
- [Directory & File Breakdown](#directory--file-breakdown)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Seeding Admin Account](#seeding-admin-account)
  - [Running the Application](#running-the-application)
- [API Endpoints Reference](#api-endpoints-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [License](#license)

---

## 🌟 Overview

The **Wayfinder E-Bus System** bridges the gap between public transport commuters, drivers, and fleet operators:
- **Commuters** can search routes, locate nearby bus stops, track bus locations live on interactive maps, and view estimated arrival predictions.
- **Drivers** have a specialized mobile-friendly dashboard to manage their assigned bus, toggle trip statuses, and stream live GPS location coordinates.
- **Administrators** have complete control over fleet operations: managing buses and drivers, viewing system analytics, and monitoring registered users.

---

## ✨ Key Features

- 📍 **Real-Time GPS Tracking**: Drivers transmit live GPS coordinates; users see real-time bus movements on interactive Leaflet maps.
- 🗺️ **OpenStreetMap & Transit Integration**: Proxied endpoints for Nominatim (geocoding & place search) and Overpass API (locating nearby bus stops).
- 🔐 **Role-Based Access Control (RBAC)**: Distinct permissions and middleware for three roles: `user`, `driver`, and `admin`.
- 🛡️ **Secure Authentication**: Password hashing with `bcryptjs`, tamper-proof HTTP-only cookie session handling with `jsonwebtoken` (JWT), and input validation.
- 📊 **Administrative Metrics**: Real-time dashboard showing active fleet count, assigned drivers, and registered user base.
- 🏗️ **Clean Architecture**: Strict separation of concerns (Composition Root, Controllers, Services, Mongoose Models, Middleware, and Centralized Error Handling).

---

## 🗂️ Project Architecture & Structure

```
E-Bus/
├── .env.example                  # Template for environment variables
├── .gitignore                     # Git ignore rules (node_modules, .env)
├── index.js                       # Composition root & server startup entrypoint
├── package.json                   # Project metadata and dependencies
├── package-lock.json              # Locked dependency tree
├── server.js                      # Legacy single-file server (retained for reference)
│
├── public/                        # Client-side web assets & user interfaces
│   ├── index.html                 # Commuter live tracking & route discovery view
│   ├── app.js                     # Main client logic, Leaflet map & API polling
│   ├── styles.css                 # Main application styling
│   ├── login.html                 # Authentication login portal
│   ├── register.html              # User registration portal
│   ├── auth.css                   # Authentication screens styling
│   ├── auth.js                    # Auth form submission & session management
│   ├── driver-dashboard.html      # Driver control panel interface
│   ├── driver.js                  # Driver telemetry, geolocation & status updates
│   ├── driver.css                 # Driver dashboard styles
│   ├── driver-register.html       # Driver registration interface
│   ├── driver-register.js         # Driver registration client handler
│   ├── admin-dashboard.html       # Comprehensive fleet management UI
│   ├── admin.html                 # Admin portal entry / redirect
│   ├── admin.js                   # Admin dashboard logic, CRUD operations & metrics
│   └── admin.css                  # Admin dashboard styling
│
├── scripts/                       # Operational and testing CLI utility scripts
│   ├── create-admin.js            # CLI utility to seed or promote an admin account
│   ├── driver-smoke-test.js       # End-to-end automated smoke test for driver workflows
│   └── smoke-test.js              # Integration smoke test for core auth & API routes
│
└── src/                           # Modular backend application source code
    ├── app.js                     # Express app setup, routing & centralized error handler
    ├── config/                    # Configuration modules & database setup
    │   ├── index.js               # Environment variables aggregator & defaults
    │   ├── db.js                  # Mongoose MongoDB connection lifecycle
    │   └── migrateAccounts.js     # Helper migration script for user roles/accounts
    ├── controllers/               # HTTP request handlers & response orchestration
    │   ├── adminController.js     # Admin fleet, driver, bus CRUD & stats endpoints
    │   ├── authController.js      # Register, login, logout, profile handlers
    │   ├── busController.js       # Bus searching, details, location & predictions
    │   ├── driverController.js    # Admin driver assignment operations
    │   └── driverPanelController.js# Driver profile, bus status & GPS telemetry
    ├── errors/
    │   └── AppError.js            # Custom operational error class for HTTP responses
    ├── middleware/
    │   └── auth.js                # JWT verification and RBAC guards (user/driver/admin)
    ├── models/                    # Mongoose data schemas & models
    │   ├── Admin.js               # Admin schema (email, hashed password, role)
    │   ├── Bus.js                 # Bus schema (bus number, route, capacity, driver, status)
    │   ├── Driver.js              # Driver schema (license, phone, assigned bus, active state)
    │   ├── Location.js            # Real-time coordinates schema (lat, lon, speed, heading)
    │   └── User.js                # Commuter user schema (name, email, phone, city)
    ├── services/                  # Core business logic layer
    │   ├── accountService.js      # Account credential validation & verification
    │   ├── tokenService.js        # JWT generation, cookie setting & clearing
    │   └── userService.js         # User registration & data manipulation
    ├── utils/
    │   └── logger.js              # Application logging helper
    └── validators/
        └── authValidator.js       # Validation rules for inputs (email, password, etc.)
```

---

## 🔍 Directory & File Breakdown

### Root Directory
- **`index.js`**: The composition root of the application. Reads configuration, establishes the MongoDB connection, instantiates the Express application via `createApp()`, and starts listening on the designated port.
- **`.env.example`**: Example template outlining required environment variables for rapid deployment.

### `src/` (Backend Application)
- **`src/app.js`**: Configures middleware (`cors`, `express.json`, `cookieParser`, `express.static`), maps all REST API endpoints, handles proxying for OSM services, and implements centralized operational error handling.
- **`src/config/`**:
  - `db.js`: Handles resilient connection to MongoDB using Mongoose.
  - `index.js`: Loads `.env` via `dotenv` and exposes strongly-typed configuration settings.
  - `migrateAccounts.js`: Database utility for maintaining account consistency across schemas.
- **`src/controllers/`**:
  - `adminController.js`: Handles admin management of buses, drivers, user listings, and fleet statistics.
  - `authController.js`: Manages user and driver registration, unified login, session logout, and user profile retrieval/updates.
  - `busController.js`: Enables route search, fetches bus details, calculates arrival predictions, and delivers recent location breadcrumbs.
  - `driverPanelController.js`: Receives live GPS updates and telemetry from drivers, manages trip active/inactive status.
- **`src/middleware/auth.js`**: Houses `authMiddleware`, `adminMiddleware`, and `driverMiddleware` to enforce token authentication and role authorization.
- **`src/models/`**: Defines MongoDB collections for `User`, `Driver`, `Admin`, `Bus`, and `Location`.
- **`src/services/`**: Encapsulates reusable business logic (password hashing, JWT issuance via `tokenService`, user record mutations).

### `public/` (Frontend Interfaces)
- **Commuter UI (`index.html`, `app.js`, `styles.css`)**: Live map interface with Leaflet, search bar for bus routes, stop inspection, and live marker rendering.
- **Driver UI (`driver-dashboard.html`, `driver.js`, `driver.css`)**: Driver workstation with one-click trip activation, HTML5 Geolocation API stream, and bus assignment details.
- **Admin UI (`admin-dashboard.html`, `admin.js`, `admin.css`)**: Tabbed administrative interface for viewing KPIs, adding/editing buses and drivers, and auditing registered users.
- **Auth UI (`login.html`, `register.html`, `driver-register.html`, `auth.js`)**: Responsive forms for onboarding commuters and transit drivers.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Runtime** | Node.js (v18+) |
| **Framework** | Express.js (v5.x) |
| **Database & ODM** | MongoDB, Mongoose (v9.x) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, `cors` |
| **Frontend** | HTML5, CSS3, Modern JavaScript (Fetch API, Geolocation API) |
| **Mapping & GIS** | Leaflet.js, OpenStreetMap Nominatim API, Overpass API |
| **Configuration** | Dotenv |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI.
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JAGDISHPOOJARY-41/E-bus-management.git
   cd E-bus-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your variables in `.env`:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/E-bus
JWT_SECRET=your_super_secret_random_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Seeding Admin Account

Use the built-in CLI utility to create your initial administrator account:

```bash
node scripts/create-admin.js admin@example.com AdminPassword123 "System Administrator"
```

### Running the Application

Start the server:
```bash
npm start
```

The application will be live at:
- **Commuter Portal**: [http://localhost:3000](http://localhost:3000)
- **Login Page**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
- **Driver Dashboard**: [http://localhost:3000/driver-dashboard.html](http://localhost:3000/driver-dashboard.html)
- **Admin Dashboard**: [http://localhost:3000/admin-dashboard.html](http://localhost:3000/admin-dashboard.html)

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Public | Register commuter account |
| `POST` | `/api/driver/register` | Public | Register driver account |
| `POST` | `/api/login` | Public | Login with email & password |
| `POST` | `/api/logout` | Public | Clear auth cookie |
| `GET` | `/api/user` | User/Admin/Driver | Fetch current logged-in profile |
| `PUT` | `/api/user` | User/Admin/Driver | Update personal profile details |

### 🚌 Buses & Live Tracking (`/api`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/buses/search?route=...` | User | Search buses by route or name |
| `GET` | `/api/buses/:id` | User | Get bus details and route stops |
| `GET` | `/api/locations/:busId` | User | Fetch latest GPS location of a bus |
| `GET` | `/api/predictions/:busId` | User | Calculate estimated arrival predictions |
| `GET` | `/api/location/search?q=...` | Public | Geocode location query via OpenStreetMap |
| `GET` | `/api/bus-stops?lat=...&lon=...` | Public | Find transit stops near coordinates via Overpass |

### 🚏 Driver Panel (`/api/driver`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/driver/profile` | Driver | Get driver profile and assignment |
| `GET` | `/api/driver/bus` | Driver | Get assigned bus details |
| `PUT` | `/api/driver/bus/status` | Driver | Update bus operational status (active/inactive) |
| `POST` | `/api/driver/tracking` | Driver | Stream live GPS breadcrumb update |
| `POST` | `/api/locations` | Driver | Record point location data |

### ⚙️ Administration (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Admin | Retrieve fleet and user statistics |
| `GET` | `/api/admin/buses` | Admin | List all fleet buses |
| `POST` | `/api/admin/buses` | Admin | Register a new bus to the fleet |
| `PUT` | `/api/admin/buses/:id` | Admin | Update bus route, capacity, or assignment |
| `DELETE` | `/api/admin/buses/:id` | Admin | Remove a bus from the fleet |
| `GET` | `/api/admin/drivers` | Admin | List registered drivers |
| `POST` | `/api/admin/drivers` | Admin | Create a new driver profile |
| `PUT` | `/api/admin/drivers/:id` | Admin | Modify driver details & assignment |
| `DELETE` | `/api/admin/drivers/:id` | Admin | Remove driver profile |
| `GET` | `/api/admin/users` | Admin | List all registered commuter accounts |

---

## 🧪 Testing & Quality Assurance

The project includes automated integration and smoke testing suites:

```bash
# Run the core authentication & route smoke test
npm test

# Run the comprehensive driver workflow test
node scripts/driver-smoke-test.js
```

---

## 📄 License

This project is licensed under the **ISC License**.
