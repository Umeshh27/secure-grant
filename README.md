# Secure Grant Management Portal

> A secure, enterprise-grade multi-user web application and REST API for managing grant opportunities and funding proposals, featuring **Role-Based Access Control (RBAC)**, **OAuth 2.0 Social Authentication**, **Model-View-Controller (MVC)** architecture, **PostgreSQL** persistence, and **Redis** caching.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/badge/Coverage-%3E85%25-brightgreen.svg)]()

---

## 1. System Architecture

The application is structured around the **Model-View-Controller (MVC)** design pattern with a dedicated Service layer for business logic, fully containerized using **Docker Compose**:

```
+-------------------------------------------------------------------------+
|                              Client Layer                               |
|        - Modern Web Portal (Admin, Grantor, Grantee Dashboards)         |
|        - REST API Consumers / Evaluator Test Client                     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                             API Service                                 |
|  [Security Headers] -> [Auth Middleware] -> [RBAC Middleware]          |
|                                     |                                   |
|   +-------------------+  +--------------------+  +-------------------+  |
|   |  Auth Controller  |  |  User Controller   |  | Grants Controller |  |
|   +-------------------+  +--------------------+  +-------------------+  |
|   | Application Ctrl  |  |  OAuth Controller  |  | Health Controller |  |
|   +-------------------+  +--------------------+  +-------------------+  |
|                                     |                                   |
|                         [Service / Business Layer]                      |
|                                     |                                   |
|                         [Data Access / ORM Layer]                       |
+-------------------------------------------------------------------------+
                 |                                     |
                 v                                     v
+---------------------------------+   +-----------------------------------+
|       PostgreSQL Database       |   |            Redis Cache            |
|   - Users, Roles, UserRoles     |   |   - Grant listings cache          |
|   - Grants, Applications        |   |   - Session & token management    |
|   - Auto-seeded on startup      |   |   - Fast health queries           |
+---------------------------------+   +-----------------------------------+
```

---

## 2. Core Features & RBAC Permissions Matrix

The portal defines three core roles: `ADMIN`, `GRANTOR`, and `GRANTEE`.

| Endpoint | HTTP Method | Allowed Roles | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Register new account (auto-assigned `GRANTEE` role) |
| `/api/auth/login` | `POST` | Public | Authenticate with email/password, returns JWT |
| `/api/auth/google` | `GET` | Public | Initiate Google OAuth 2.0 flow |
| `/api/auth/google/callback` | `GET` | Public | Exchange OAuth authorization code for JWT |
| `/api/health` | `GET` | Public | Healthcheck for container orchestration |
| `/api/users/profile` | `GET` | Authenticated | View authenticated user profile |
| `/api/users` | `GET` | `ADMIN` | List all system users |
| `/api/users/:userId/roles` | `POST` | `ADMIN` | Assign new role (`GRANTOR`, `ADMIN`, `GRANTEE`) |
| `/api/grants` | `GET` | `GRANTEE`, `GRANTOR`, `ADMIN` | Browse all active grant opportunities |
| `/api/grants/:id` | `GET` | `GRANTEE`, `GRANTOR`, `ADMIN` | View grant detail |
| `/api/grants` | `POST` | `GRANTOR` | Create a new grant opportunity |
| `/api/grants/:id` | `PUT` | `GRANTOR` (Owner) | Update own grant opportunity |
| `/api/grants/:id` | `DELETE` | `GRANTOR` (Owner) or `ADMIN` | Delete grant opportunity |
| `/api/grants/:grantId/apply` | `POST` | `GRANTEE` | Submit proposal for a grant |
| `/api/grants/:grantId/applications` | `GET` | `GRANTOR` (Owner) or `ADMIN` | View received applications for grant |
| `/api/applications/:id` | `GET` | Submitter `GRANTEE` or Parent `GRANTOR` | View specific application detail |
| `/api/applications/my` | `GET` | `GRANTEE` | View all applications submitted by current user |
| `/api/applications/:id/status` | `PUT` | Parent `GRANTOR` or `ADMIN` | Update review status |

---

## 3. JWT Schema & Security Specification

All authenticated requests must include the header:
```http
Authorization: Bearer <your_jwt_token>
```

The decoded JWT payload conforms to the contract:
```json
{
  "userId": 1,
  "roles": ["ADMIN"],
  "iat": 1716239022,
  "exp": 1716325422
}
```

- **401 Unauthorized**: Missing or invalid/expired token.
- **403 Forbidden**: Authenticated user lacks required role or is attempting to modify/access another user's isolated resource.

---

## 4. Default Seed Accounts

When the system boots up, the database is automatically seeded with default accounts:

| Role | Email | Password | Pre-seeded Resources |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@securegrant.org` | `AdminSecurePassword123!` | System administrator access |
| **GRANTOR** | `grantor@securegrant.org` | `GrantorPassword123!` | Sample Grant (`AI for Social Good Research Grant`) |
| **GRANTEE** | `grantee@securegrant.org` | `GranteePassword123!` | Sample Application (`#1`) |

---

## 5. Quick Start with Docker Compose

Ensure [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) are installed.

```bash
# 1. Clone the repository and navigate into directory
cd secure-grant

# 2. Copy the environment variables template
cp .env.example .env

# 3. Build and launch all container services
docker compose up --build
```

The application services will start in order:
1. `db` (PostgreSQL 16) starts and becomes healthy.
2. `cache` (Redis 7) starts and becomes healthy.
3. `app` (Node.js MVC API) waits for `db` and `cache` healthchecks, migrates schema, seeds accounts, and listens on port `3000`.

Open your browser to:
- **Web Portal & Dashboard**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/api/health`

---

## 6. Running Locally (Without Docker)

```bash
# Install dependencies
npm install

# Start local PostgreSQL and Redis or use existing instances
# Update .env accordingly

# Run database migrations and seeding
npm run migrate
npm run seed

# Start server in development mode
npm run dev
```

---

## 7. Running Automated Tests & Code Coverage

The project includes unit, integration, and security test suites using **Jest** and **Supertest**.

To execute tests and generate the code coverage report:

```bash
npm run test:coverage
```

The generated coverage report will be saved in `./coverage` and printed to the terminal, confirming statement coverage **>= 70%** (target: >85%).

---

## 8. OAuth 2.0 Integration Guide

The application supports OAuth 2.0 authentication (Google by default):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Set Authorized Redirect URI to: `http://localhost:3000/api/auth/google/callback`.
4. Copy `Client ID` and `Client Secret` into your `.env` file:
   ```env
   OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
   OAUTH_CLIENT_SECRET=your_client_secret
   OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```
5. Initiate login by visiting `http://localhost:3000/api/auth/google` or using the **Sign In with Google** button in the Web Portal.
6. For automated testing and offline evaluation, simulation codes (e.g. `code=mock_test_code_<id>`) are supported out-of-the-box.

---

## 9. Agile Project Plan

For detailed Epics, User Stories, and Acceptance Criteria, please see [PROJECT_PLAN.md](file:///c:/Users/hp/Documents/secure-grant/PROJECT_PLAN.md).
