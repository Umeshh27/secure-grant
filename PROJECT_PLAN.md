# Agile Project Plan: Secure Multi-User Grant Management Portal

## 1. Project Overview & Objectives
The **Secure Grant Management Portal** is an enterprise-grade web application designed to connect grant-making organizations (Grantors) with funding applicants (Grantees), governed by administrative personnel (Admins). The platform is engineered with strict Role-Based Access Control (RBAC), OAuth 2.0 social authentication, Model-View-Controller (MVC) architecture, database persistence, and caching for high-performance session and grant queries.

---

## 2. Epics & User Stories

### Epic 1: Identity, Authentication & OAuth 2.0 Integration
Secure access to the platform for all user types via standard email/password credentials and federated OAuth 2.0 identity providers.

#### User Story 1.1: Local User Registration & Login
- **As a** new applicant or grantor,
- **I want to** register with my email, name, and password, and subsequently log in,
- **So that** I can access the portal and obtain an authenticated session token.
- **Acceptance Criteria**:
  1. `POST /api/auth/register` accepts `name`, `email`, and `password`, creates a user with the default `GRANTEE` role, and returns HTTP 201 with user details (excluding password).
  2. `POST /api/auth/login` validates credentials, rejects invalid attempts with HTTP 401, and on success returns HTTP 200 with an `accessToken` (JWT).
  3. The JWT payload strictly adheres to `{ userId, roles: [...], iat, exp }`.

#### User Story 1.2: Third-Party OAuth 2.0 Social Sign-In
- **As a** user,
- **I want to** sign in using my Google account,
- **So that** I can authenticate quickly without creating or remembering another password.
- **Acceptance Criteria**:
  1. `GET /api/auth/google` redirects the user to Google's OAuth 2.0 consent screen with requested scopes (`openid`, `profile`, `email`).
  2. `GET /api/auth/google/callback` receives an authorization `code`, exchanges it server-to-server for an access token, and fetches user profile details.
  3. If the user does not exist, an account is automatically created in the database and assigned the default `GRANTEE` role.
  4. The endpoint issues a valid signed JWT containing the user's ID and assigned roles.

---

### Epic 2: Role-Based Access Control (RBAC) & User Management
Enforce security boundaries so that users can only access actions and resources permitted by their assigned roles (`ADMIN`, `GRANTOR`, `GRANTEE`).

#### User Story 2.1: Granular Role Enforcement Middleware
- **As a** security engineer,
- **I want** all protected endpoints guarded by an RBAC middleware,
- **So that** unauthenticated requests receive HTTP 401 and unauthorized requests receive HTTP 403.
- **Acceptance Criteria**:
  1. Any request to a protected endpoint lacking a valid `Authorization: Bearer <token>` header receives HTTP 401 Unauthorized.
  2. Any request where the authenticated user lacks the necessary role for that endpoint receives HTTP 403 Forbidden.
  3. Responses include a standardized error JSON structure.

#### User Story 2.2: Administrative Role Assignment
- **As an** Administrator (`ADMIN`),
- **I want to** assign new roles to existing users (such as elevating a user to `GRANTOR` or `ADMIN`),
- **So that** organizations can grant publishing privileges to verified entities.
- **Acceptance Criteria**:
  1. `POST /api/users/:userId/roles` accepts `{ "roleName": "GRANTOR" }` and is accessible exclusively to users with the `ADMIN` role.
  2. Non-admin users attempting to call this endpoint receive HTTP 403 Forbidden.
  3. The assigned role is persisted in the `user_roles` relational join table and reflected in subsequent token issuances.

---

### Epic 3: Grant Opportunity Lifecycle Management
Allow Grantors to publish and manage grant funding opportunities while enabling public/grantee discovery.

#### User Story 3.1: Grant Creation & Publishing
- **As a** Grantor (`GRANTOR`),
- **I want to** create and publish grant opportunities with title, description, and funding amount,
- **So that** eligible grantees can discover and apply for funding.
- **Acceptance Criteria**:
  1. `POST /api/grants` accepts `title`, `description`, and `amount`, validates inputs, automatically binds the logged-in user as `grantor_id`, and returns HTTP 201.
  2. Non-grantors attempting to create a grant receive HTTP 403 Forbidden.
  3. The grant listing cache in Redis is invalidated upon new grant creation.

#### User Story 3.2: Grant Modification & Ownership Protection
- **As a** Grantor (`GRANTOR`),
- **I want to** edit or delete only the grants I personally created,
- **So that** other grantors cannot tamper with my organization's opportunities.
- **Acceptance Criteria**:
  1. `PUT /api/grants/:id` allows the owner Grantor to update grant details, returning HTTP 200 with the updated entity.
  2. A different Grantor attempting to update another Grantor's grant receives HTTP 403 Forbidden.
  3. `DELETE /api/grants/:id` allows the grant owner or an `ADMIN` to remove the grant, rejecting unauthorized users with HTTP 403.

#### User Story 3.3: Grant Exploration & Detail View
- **As a** Grantee (`GRANTEE`), Grantor, or Admin,
- **I want to** view a list of all active grants and inspect individual grant details,
- **So that** I can evaluate funding criteria before applying.
- **Acceptance Criteria**:
  1. `GET /api/grants` returns an array of all available grants with grantor details (HTTP 200).
  2. `GET /api/grants/:id` returns the specific grant object (HTTP 200) or HTTP 404 if not found.
  3. Grant queries leverage Redis caching for fast response times.

---

### Epic 4: Grant Application Submission & Review Workflow
Enable Grantees to apply for funding opportunities and Grantors to review submitted proposals.

#### User Story 4.1: Proposal Submission
- **As a** Grantee (`GRANTEE`),
- **I want to** submit a grant application proposal to an open grant opportunity,
- **So that** my project can be evaluated for funding.
- **Acceptance Criteria**:
  1. `POST /api/grants/:grantId/apply` accepts `{ "proposal": "..." }`, validates content, sets status to `submitted`, records `grantee_id`, and returns HTTP 201.
  2. Users without the `GRANTEE` role attempting to apply receive HTTP 403 Forbidden.
  3. Attempting to apply to a non-existent grant returns HTTP 404 Not Found.

#### User Story 4.2: Application Review by Grant Owner
- **As a** Grantor (`GRANTOR`),
- **I want to** view all applications submitted to my specific grants,
- **So that** I can evaluate proposals and make funding decisions.
- **Acceptance Criteria**:
  1. `GET /api/grants/:grantId/applications` returns all applications for that grant, accessible ONLY to the Grantor who created the grant.
  2. Other Grantors or non-owners attempting to view the applications receive HTTP 403 Forbidden.
  3. `GET /api/applications/:appId` allows the applicant Grantee and the parent grant's Grantor to view the application detail.

---

## 3. Technical Architecture & Constraints
- **Pattern**: Model-View-Controller (MVC) with dedicated Service Layer.
- **Persistence**: PostgreSQL relational database with foreign key integrity and cascade rules.
- **Caching**: Redis instance for fast read-through caching and token session management.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` with healthchecks on all services.
- **Quality Assurance**: Jest unit and integration test suite with >= 70% statement coverage (`npm run test:coverage`).
