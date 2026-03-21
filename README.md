# DigiCore CBS — Core Banking System

A comprehensive, enterprise-grade core banking platform built on a BIAN-aligned service domain model. DigiCore CBS covers every aspect of modern banking — retail, corporate, treasury, risk, open banking, and operations — in a single cohesive system.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Frontend Features](#frontend-features)
- [Backend Modules](#backend-modules)
- [Database](#database)
- [Testing](#testing)
- [Deployment Profiles](#deployment-profiles)
- [Environment Variables](#environment-variables)

---

## Overview

DigiCore CBS is a full-stack core banking system designed for multi-jurisdiction deployments. It implements the BIAN (Banking Industry Architecture Network) service domain model across 150+ backend modules and 38 frontend feature areas.

**Key capabilities:**
- Customer lifecycle management (KYC, onboarding, segmentation)
- Full deposit product suite (savings, fixed, recurring, goal-based)
- Lending (retail, corporate, microfinance, mortgages, POS lending)
- Payments and remittances (ACH, SWIFT, mobile money, USSD)
- Cards (issuance, clearing, tokenization, POS/ATM)
- Trade finance and capital markets
- Treasury, ALM, and funds transfer pricing
- Risk management (credit, market, liquidity, operational, ECL/IFRS 9)
- Compliance and regulatory reporting (AML, sanctions, audit)
- Open Banking / PSD2 (TPP management, consent, API marketplace)
- Wealth management and personal financial management
- Real-time notifications, communications, and loyalty

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Language | Java 25 |
| Framework | Spring Boot 3.3.5 |
| Security | Spring Security + OAuth2 Resource Server (JWT) |
| Database | PostgreSQL 16 |
| ORM | Hibernate 6 / Spring Data JPA |
| Cache | Redis (Spring Data Redis) + Caffeine |
| Migrations | Flyway (58 versioned migrations) |
| Mapping | MapStruct 1.6.2 |
| JSON | Jackson + Hypersistence Utils (PostgreSQL JSON) |
| API Docs | SpringDoc OpenAPI 2.6.0 (Swagger UI) |
| Observability | Micrometer + Prometheus + Spring Actuator |
| Build | Gradle 9.1.0 (Kotlin DSL) |
| Testing | JUnit 5, Testcontainers, REST Assured, ArchUnit |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18.3 + TypeScript 5.4 |
| Build | Vite 5.2 |
| Styling | Tailwind CSS 3.4 |
| Components | Radix UI (headless) |
| State | Zustand 4.5 |
| Server State | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Forms | React Hook Form 7 + Zod 3 |
| Charts | Recharts 2.12 |
| Routing | React Router DOM 6 |
| HTTP | Axios 1.13 |
| Testing | Vitest 4.1, Playwright 1.58 |
| Mocking | MSW 2 (Mock Service Worker) |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Identity Provider | Keycloak 26 |
| Process Manager | PM2 |
| CI/CD | GitHub Actions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                        │
│              React 18 + TypeScript (Vite)                   │
│                    localhost:3001                           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / JWT Bearer
            ┌───────────────┼────────────────┐
            │               │                │
            ▼               ▼                ▼
    ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
    │   Keycloak   │ │  Spring Boot│ │  Swagger UI │
    │  :8180/cbs   │ │  API :8080  │ │  /api/      │
    │  (OIDC/PKCE) │ │  /api/v1/.. │ │  swagger-ui │
    └──────────────┘ └──────┬──────┘ └─────────────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
        ┌────────────┐ ┌─────────┐ ┌─────────┐
        │ PostgreSQL │ │  Redis  │ │Flyway   │
        │  :5432/cbs │ │  :6379  │ │Migrations│
        └────────────┘ └─────────┘ └─────────┘
```

The frontend proxies all `/api/*` requests to the backend at runtime. Authentication uses Keycloak OIDC with PKCE (Authorization Code flow). The backend validates JWTs against the Keycloak realm and enforces role-based method security via `@PreAuthorize`.

---

## Prerequisites

- **Docker** — for PostgreSQL, Redis, and Keycloak
- **Java 25** — for building and running the backend (`openjdk@25`)
- **Node.js 20+** — for the frontend
- **PM2** — process manager (`npm install -g pm2`)

> The Gradle wrapper and `openjdk@25` (via Homebrew) handle the Java toolchain automatically.

### Verify installations

```bash
java --version       # openjdk 25+
node --version       # v20+
docker --version     # 24+
pm2 --version        # 5+
```

---

## Quick Start

### 1. Start infrastructure (Docker)

```bash
# PostgreSQL
docker run -d --name cbs-postgres \
  -e POSTGRES_DB=cbs \
  -e POSTGRES_USER=cbs_admin \
  -e POSTGRES_PASSWORD=cbs_password \
  -p 5432:5432 \
  postgres:16-alpine

# Redis
docker run -d --name cbs-redis \
  -p 6379:6379 \
  redis:7-alpine

# Keycloak
docker run -d --name cbs-keycloak \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -p 8180:8080 \
  quay.io/keycloak/keycloak:26.0 start-dev
```

### 2. Set up Keycloak

After Keycloak starts at `http://localhost:8180`:

1. Log in to the admin console at `http://localhost:8180/admin` (`admin` / `admin`)
2. Create a realm named **`cbs`**
3. Inside the `cbs` realm, create a client:
   - **Client ID:** `cbs-app`
   - **Client type:** Public
   - **Standard flow:** Enabled
   - **Valid redirect URIs:** `http://localhost:3001/*`
   - **Web origins:** `*`
4. Create realm roles: `CBS_ADMIN`, `CBS_OFFICER`, `TELLER`, `BRANCH_MANAGER`, `COMPLIANCE`, `TREASURY`
5. Create a user and assign the `CBS_ADMIN` role

> If the realm and users already exist (e.g. from a previous setup), skip to step 5 and reset the password.

**Default admin account** (if the realm was pre-configured):

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Admin1234!` |
| Role | `CBS_ADMIN` |

### 3. Build and start backend

```bash
# Build the JAR (requires openjdk@25)
JAVA_HOME="$(brew --prefix openjdk@25)/libexec/openjdk.jdk/Contents/Home" \
  ./gradlew bootJar --no-daemon

# Install frontend dependencies
cd cbs-frontend && npm install && cd ..
```

### 4. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 logs   # tail all logs
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/api/swagger-ui |
| Health Check | http://localhost:8080/api/actuator/health |
| Keycloak | http://localhost:8180 |

---

## Configuration

### ecosystem.config.js

Controls PM2 process definitions for both services.

```js
// Key backend env vars
CBS_DB_URL              = 'jdbc:postgresql://localhost:5432/cbs'
CBS_DB_USERNAME         = 'cbs_admin'
CBS_DB_PASSWORD         = 'cbs_password'
CBS_REDIS_HOST          = 'localhost'
CBS_REDIS_PORT          = '6379'
CBS_SERVER_PORT         = '8080'
CBS_OAUTH2_ISSUER_URI   = 'http://localhost:8180/realms/cbs'
CBS_OAUTH2_ACCEPTED_AUDIENCES = 'cbs-app'
SPRING_PROFILES_ACTIVE  = 'dev'
```

### Backend: application.yml

Located at `src/main/resources/application.yml`. All values are overridable via environment variables.

| Key | Env Var | Default |
|-----|---------|---------|
| Server port | `CBS_SERVER_PORT` | `8080` |
| DB URL | `CBS_DB_URL` | `jdbc:postgresql://localhost:5432/cbs` |
| DB username | `CBS_DB_USERNAME` | `cbs_admin` |
| Redis host | `CBS_REDIS_HOST` | `localhost` |
| OAuth2 issuer | `CBS_OAUTH2_ISSUER_URI` | *(empty — dev mode)* |
| Accepted audiences | `CBS_OAUTH2_ACCEPTED_AUDIENCES` | `cbs-app` |
| Cache type | `CBS_CACHE_TYPE` | `redis` |
| Log level | `CBS_LOG_LEVEL` | `INFO` |

### Frontend: .env

Create `cbs-frontend/.env.local` to override Vite defaults:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=cbs
VITE_KEYCLOAK_CLIENT_ID=cbs-app
```

---

## Running the Application

### Development (PM2)

```bash
pm2 start ecosystem.config.js   # start both services
pm2 restart cbs-backend          # restart backend only
pm2 restart cbs-backend --update-env  # restart with new env vars
pm2 logs cbs-backend --lines 50  # tail backend logs
pm2 logs cbs-frontend --lines 50 # tail frontend logs
pm2 status                       # process status
pm2 stop all                     # stop everything
```

### Backend only

```bash
JAVA_HOME="$(brew --prefix openjdk@25)/libexec/openjdk.jdk/Contents/Home" \
  SPRING_PROFILES_ACTIVE=dev \
  CBS_OAUTH2_ISSUER_URI=http://localhost:8180/realms/cbs \
  java -jar build/libs/cbs-1.0.0-SNAPSHOT.jar
```

### Frontend only

```bash
cd cbs-frontend
npm run dev        # starts at http://localhost:3001
```

### Build backend from source

```bash
# Requires openjdk@25 (brew install openjdk@25)
JAVA_HOME="$(brew --prefix openjdk@25)/libexec/openjdk.jdk/Contents/Home" \
  ./gradlew bootJar --no-daemon
```

> **Note:** The Gradle wrapper is pinned to Gradle 9.1.0 and the backend toolchain is pinned to Java 25. The built JAR runs on any JVM 25+.

---

## Authentication

DigiCore CBS uses **Keycloak** as its OpenID Connect provider. The frontend implements **PKCE (Proof Key for Code Exchange)** Authorization Code flow — passwords are never handled by the application itself.

### Login flow

1. User visits `http://localhost:3001/login`
2. Clicks **"Continue to secure sign-in"** (optionally entering a username hint)
3. Browser redirects to Keycloak's hosted login page at `http://localhost:8180`
4. User enters credentials on Keycloak
5. Keycloak redirects back to `/auth/callback` with an authorization code
6. Frontend exchanges the code for a JWT access token (stored in `sessionStorage`)
7. All subsequent API calls include `Authorization: Bearer <token>`
8. Backend validates the JWT signature and claims against the Keycloak realm

### Roles

| Role | Access |
|------|--------|
| `CBS_ADMIN` | Full access to all modules and operations |
| `CBS_OFFICER` | Standard banking operations, customer management |
| `TELLER` | Teller operations, cash transactions |
| `BRANCH_MANAGER` | Branch operations, staff oversight |
| `COMPLIANCE` | Compliance monitoring, AML, regulatory reports |
| `TREASURY` | Treasury operations, FX, ALM |
| `LOAN_OFFICER` | Loan origination, credit assessment |
| `RISK_OFFICER` | Risk monitoring and reporting |

### Dev mode

When `CBS_OAUTH2_ISSUER_URI` is left empty, the backend switches to **permit-all dev mode** — all API requests are accepted without a token. A dev login panel appears at the bottom of the login page (only in Vite dev mode) for instant access without Keycloak.

---

## API Reference

**Base URL:** `http://localhost:8080/api`
**Versioning:** `/v1/` prefix on all business endpoints
**Auth:** `Authorization: Bearer <keycloak-access-token>`

### Interactive docs

| Interface | URL |
|-----------|-----|
| Swagger UI | http://localhost:8080/api/swagger-ui |
| OpenAPI JSON | http://localhost:8080/api/v3/api-docs |

### Actuator endpoints (no auth required)

| Endpoint | Description |
|----------|-------------|
| `GET /api/actuator/health` | Application health |
| `GET /api/actuator/metrics` | Micrometer metrics |
| `GET /api/actuator/prometheus` | Prometheus scrape endpoint |
| `GET /api/actuator/info` | Build information |

### Domain endpoint examples

```
# Customers
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/{id}
PUT    /api/v1/customers/{id}

# Accounts
GET    /api/v1/accounts/customer/{customerId}
POST   /api/v1/accounts
GET    /api/v1/accounts/{id}/transactions

# Loans
GET    /api/v1/lending
POST   /api/v1/lending/apply
GET    /api/v1/lending/{id}/schedule

# Payments
POST   /api/v1/payments
GET    /api/v1/payments/{id}/status

# Open Banking
GET    /api/v1/open-banking/tpp-clients
GET    /api/v1/open-banking/consents
GET    /api/v1/open-banking/api-products

# Reports
GET    /api/v1/reports/executive/kpis
GET    /api/v1/reports/loans/stats
GET    /api/v1/reports/deposits/stats

# Audit
GET    /api/v1/audit/entity/CUSTOMER/{id}
```

---

## Frontend Features

The frontend is a single-page application organized into 38 feature modules under `cbs-frontend/src/features/`:

| Module | Description |
|--------|-------------|
| `auth` | Login, PKCE callback, session management, protected routes |
| `dashboard` | Executive KPIs, operational summary, real-time metrics |
| `customers` | Customer onboarding, CIF management, KYC, segmentation |
| `accounts` | Account management, statements, holds, lifecycle |
| `deposits` | Fixed deposits, recurring deposits, savings goals |
| `lending` | Loan origination, disbursement, repayment schedules, collections |
| `payments` | Transfers, SWIFT, ACH, mobile money, standing orders, payroll |
| `cards` | Card issuance, PIN management, tokenization, disputes |
| `transactions` | Transaction history, search, detail view |
| `statements` | Account statements, PDF export |
| `treasury` | FX trading, liquidity management, ALM, FTP |
| `capitalmarkets` | Trading book, market orders, fixed income, securitization |
| `investments` | Investment accounts, portfolio management |
| `marketdata` | Market data feeds, research, competitor analysis |
| `tradefinance` | Letters of credit, guarantees, documentary collections |
| `wealth` | Wealth management plans, advisor assignment, financial goals |
| `risk` | Credit risk, market risk, operational risk, ECL |
| `alm` | Asset-liability management, duration, gap analysis |
| `compliance` | AML monitoring, sanctions screening, regulatory reports |
| `openbanking` | TPP client registry, consent management, PSD2 compliance, API marketplace, developer portal |
| `reports` | Report builder, loan analytics, deposit analytics, executive dashboards |
| `operations` | EOD processing, open items, position management |
| `reconciliation` | Break management, reconciliation reports |
| `intelligence` | Customer intelligence, behavioral analytics |
| `channels` | Multi-channel management, ATM, POS, digital channels |
| `contactcenter` | Case management, interaction history |
| `communications` | Notification templates, customer communications |
| `notifications` | Notification preferences and delivery |
| `gateway` | API gateway, integration management |
| `agreements` | Agreement lifecycle |
| `fees` | Fee configuration, waivers, accruals |
| `custody` | Custody accounts and securities |
| `acquiring` | Merchant acquiring, terminal management |
| `advisory` | M&A advisory, tax advisory |
| `portal` | Customer self-service portal, profile, documents |
| `goals` | Savings goals tracking |
| `cases` | Internal case management |
| `admin` | System administration, user management |

---

## Backend Modules

The backend is organized into 150+ packages under `src/main/java/com/cbs/`, grouped by domain:

<details>
<summary><strong>Customer & Core Account</strong></summary>

- `account` — Core account products and operations
- `customer` — Customer lifecycle, CIF, onboarding
- `lifecycle` — Dormancy, escheatment, account closure
- `portal` — Customer portal services
- `tenant` — Multi-tenant configuration
- `segmentation` — Customer segmentation
- `custbehavior` — Behavioral analytics
</details>

<details>
<summary><strong>Deposits & Savings</strong></summary>

- `deposit` — Savings, current, fixed, and recurring deposits
- `goal` — Goal-based savings
- `escrow` — Escrow account management
- `nostro` — Nostro/vostro positions
</details>

<details>
<summary><strong>Lending</strong></summary>

- `lending` — Core lending (loans, credit facilities)
- `credit` — Credit analysis and underwriting
- `mortgage` — Mortgage products
- `microfinance` — Microfinance operations
- `overdraft` — Overdraft facilities
- `leasing` / `leasingitem` — Asset leasing
- `collections` — Collections and recovery
- `poslending` — Point-of-sale lending
</details>

<details>
<summary><strong>Payments & Money Movement</strong></summary>

- `payments` — Payment orchestration, routing, and settlement
- `cheque` — Cheque processing
- `standing` — Standing orders and recurring transfers
- `payroll` — Payroll processing
- `virtualaccount` — Virtual account services
- `achops` — ACH operations
- `lockbox` — Lockbox and bulk collection
</details>

<details>
<summary><strong>Cards & Payment Instruments</strong></summary>

- `card` — Card issuance and management
- `cardclearing` — Clearing and settlement
- `cardnetwork` — Network operations
- `cardswitch` — Transaction switching
- `issueddevice` — Payment device tracking
- `posterminal` — POS terminal management
- `atmmgmt` / `atmnetwork` — ATM management
</details>

<details>
<summary><strong>Treasury & Capital Markets</strong></summary>

- `treasury` / `treasuryanalytics` — Treasury operations and analytics
- `dealerdesk` — Dealer desk
- `ftp` — Funds transfer pricing
- `tradingbook` / `tradingmodel` / `traderposition` — Trading operations
- `capitalmarkets` — Capital markets services
- `marketorder` / `orderexecution` — Order management
- `fixedincome` — Fixed income products
- `securitization` — Securitization management
- `syndicate` / `syndicatedloan` — Syndicated lending
- `privateplacement` — Private placements
- `fundmgmt` — Fund management
- `custody` — Custody services
</details>

<details>
<summary><strong>Risk Management</strong></summary>

- `risk` — Core risk framework
- `creditmargin` — Credit and margin
- `liquidityrisk` — Liquidity risk
- `marketrisk` — Market risk
- `oprisk` — Operational risk
- `ecl` — Expected credit loss (IFRS 9)
- `quantmodel` — Quantitative models
- `modelops` — Model lifecycle
- `guidelinecompliance` — Guideline monitoring
- `limits` — Limits and exposure management
</details>

<details>
<summary><strong>Finance & Accounting</strong></summary>

- `gl` — General ledger
- `accountsreceivable` — AR management
- `finstrument` — Financial instruments
- `finstatement` / `fingateway` — Financial statements
- `alm` / `almfull` — Asset-liability management
- `econcapital` — Economic capital
</details>

<details>
<summary><strong>Compliance & Governance</strong></summary>

- `compliance` / `compliancereport` — Compliance management
- `aml` — Anti-money laundering
- `sanctions` — Sanctions screening
- `fraud` — Fraud detection
- `regulatory` — Regulatory reporting
- `audit` — Audit trails
- `governance` — Governance framework
- `approval` — Approval workflows
</details>

<details>
<summary><strong>Open Banking & Digital</strong></summary>

- `openbanking` — PSD2, TPP management, consent, API marketplace
- `pfm` — Personal financial management
- `digitalchannels` — Digital channel enablement
</details>

<details>
<summary><strong>Sales, Marketing & Service</strong></summary>

- `saleslead` / `salesplan` / `salessupport` — Sales management
- `channel` / `channelactivity` — Channel management
- `merchant` — Merchant services
- `loyalty` — Loyalty programs
- `campaign` / `promo` / `advertising` — Marketing
- `survey` — Customer surveys
- `commission` — Commission management
- `communications` / `notification` — Communications
- `contactcenter` — Contact center
- `intelligence` — Customer intelligence
</details>

<details>
<summary><strong>Operations & Platform</strong></summary>

- `branch` / `branchnetwork` — Branch operations
- `cashpool` / `centralcash` / `vault` — Cash management
- `eod` — End-of-day processing
- `openitem` — Open/suspense items
- `settlement` — Settlement operations
- `workflow` — Workflow orchestration
- `document` — Document management
- `integration` / `eventing` — Integration and events
- `common` / `admin` / `security` — Platform services
</details>

---

## Database

**Engine:** PostgreSQL 16
**Database:** `cbs`
**Schema:** `cbs`
**Migrations:** Flyway (58 versioned scripts, `V1__` through `V58__`)

### Schema evolution phases

| Version range | Domain |
|---------------|--------|
| V1 – V5 | Core: customers, accounts, lifecycle, deposits |
| V6 – V9 | Products: escrow, lending, payments, microfinance |
| V10 – V12 | Cards, regulatory, AML, notifications |
| V13 – V16 | Trade finance, GL/FTP, payments, sanctions/fraud |
| V17 – V20 | Card tokenization, fixed income, platform architecture |
| V21 – V28 | Security, integrations, intelligence, lending extensions, cash, loyalty, channels |
| V29 – V36 | ALM, reference data, investments, operational, risk models, marketing |
| V37 – V47 | Trading, capital markets, advisory, approvals, audit alignment |
| V48 – V58 | ECL, onboarding, wallets, virtual accounts, ledger hardening, reconciliation, report builder, treasury |

### Connect to the database

```bash
psql postgresql://cbs_admin:cbs_password@localhost:5432/cbs

# Inspect schema
\dn          # list schemas
SET search_path = cbs;
\dt          # list tables (~240 tables)
```

---

## Testing

### Backend

```bash
# All tests (requires PostgreSQL + Redis via Testcontainers)
./gradlew test

# Skip tests for fast build
./gradlew bootJar -x test

# Architecture tests (ArchUnit)
./gradlew test --tests "*.ArchitectureTest"
```

### Frontend

```bash
cd cbs-frontend

# Unit + integration tests (Vitest)
npm run test           # watch mode
npm run test:run       # single pass
npm run test:coverage  # with coverage report

# End-to-end tests (Playwright)
npm run e2e            # full suite
npm run e2e:ui         # Playwright UI mode
npm run e2e:smoke      # smoke tests only
npm run e2e:a11y       # accessibility tests
npm run e2e:perf       # performance tests
npm run e2e:mobile     # mobile viewport tests

# Type checking
npx tsc --noEmit
```

### Load testing

```bash
# 10s test, 8 concurrent connections
./load-tests/run-local.sh --duration 10 --connections 8

# Extended test with metrics collection
./load-tests/run-local.sh \
  --duration 60 \
  --connections 20 \
  --warmup-requests 10 \
  --collect-metrics \
  --scenarios health,customer-get,account-get,customer-search
```

> ⚠️ Load tests use the `loadtest` Spring profile which **disables all authentication**. Never deploy this profile to a production environment.

---

## Deployment Profiles

The backend supports jurisdiction-specific configuration via Spring profiles.

| Profile | Country | Currency | Activation |
|---------|---------|----------|------------|
| `dev` (default) | Global | USD | `SPRING_PROFILES_ACTIVE=dev` |
| `nigeria` | Nigeria | NGN | `SPRING_PROFILES_ACTIVE=nigeria` |
| `uk` | United Kingdom | GBP | `SPRING_PROFILES_ACTIVE=uk` |
| `uae` | UAE | AED | `SPRING_PROFILES_ACTIVE=uae` |
| `singapore` | Singapore | SGD | `SPRING_PROFILES_ACTIVE=singapore` |
| `loadtest` | N/A | N/A | Isolated test environments only |

Each profile overrides: country code, default currency, timezone, locale, institution name, IBAN format, account numbering scheme, and regulatory body.

---

## Environment Variables

### Required for production

| Variable | Description | Example |
|----------|-------------|---------|
| `CBS_DB_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://db:5432/cbs` |
| `CBS_DB_USERNAME` | Database username | `cbs_admin` |
| `CBS_DB_PASSWORD` | Database password | *(secret)* |
| `CBS_REDIS_HOST` | Redis hostname | `redis` |
| `CBS_REDIS_PORT` | Redis port | `6379` |
| `CBS_OAUTH2_ISSUER_URI` | Keycloak realm issuer URI | `https://auth.example.com/realms/cbs` |
| `CBS_OAUTH2_ACCEPTED_AUDIENCES` | Accepted JWT audiences (comma-separated) | `cbs-app` |
| `CBS_CORS_ORIGINS` | Allowed CORS origins | `https://app.example.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CBS_SERVER_PORT` | HTTP server port | `8080` |
| `CBS_CACHE_TYPE` | Cache type (`redis` or `none`) | `redis` |
| `CBS_LOG_LEVEL` | Application log level | `INFO` |
| `CBS_COUNTRY_CODE` | Deployment country | `GLOBAL` |
| `CBS_DEFAULT_CURRENCY` | Default currency code | `USD` |
| `CBS_INSTITUTION_NAME` | Institution display name | `Core Banking System` |
| `CBS_INSTITUTION_CODE` | Institution code | *(empty)* |
| `CBS_MULTI_TENANT` | Enable multi-tenancy | `false` |
| `CBS_ACCOUNT_NUMBERING` | Account number scheme | `SEQUENTIAL` |
| `JAVA_OPTS` | JVM options | `-Xmx512m -Xms256m` |

### Ledger GL codes (required for posting features)

```env
CBS_LEDGER_WALLET_SETTLEMENT_GL=
CBS_LEDGER_EXTERNAL_CLEARING_GL=
CBS_LEDGER_REMITTANCE_SETTLEMENT_GL=
CBS_LEDGER_SAVINGS_GOAL_GL=
CBS_LEDGER_OVERDRAFT_ASSET_GL=
CBS_LEDGER_TRADE_FINANCE_SETTLEMENT_GL=
CBS_LEDGER_TRADE_FINANCE_COMMISSION_GL=
```

See `backend.env.example` for a full annotated reference.

---

## Project Structure

```
cba/
├── src/
│   └── main/
│       ├── java/com/cbs/          # 150+ domain packages (Java 25)
│       └── resources/
│           ├── application.yml    # Main Spring Boot config
│           ├── application-*.yml  # Profile-specific overrides
│           └── db/migration/      # 58 Flyway SQL migrations
├── cbs-frontend/
│   ├── src/
│   │   ├── features/              # 38 React feature modules
│   │   ├── components/            # Shared UI components
│   │   ├── stores/                # Zustand state stores
│   │   ├── lib/                   # API client, formatters, utilities
│   │   └── types/                 # TypeScript type definitions
│   ├── vite.config.ts
│   └── package.json
├── docs/                          # Architecture docs, gap analyses
├── load-tests/                    # Performance testing harness
├── build.gradle.kts               # Gradle build (Kotlin DSL)
├── ecosystem.config.js            # PM2 process definitions
├── backend.env.example            # Environment variable reference
└── gradle/wrapper/                # Gradle 8.13 wrapper
```

---

## License

Proprietary — DigiCore MFB. All rights reserved.
