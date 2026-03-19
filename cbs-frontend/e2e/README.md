# CBS E2E Tests

Playwright end-to-end tests covering 20 critical user journeys in the Core Banking System.

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL running with CBS schema
- CBS backend running on port 8081 (or via webServer config)

### Install

```bash
cd cbs-frontend
npm install
npx playwright install --with-deps chromium
```

### Configure environment

Copy `.env.test` and update credentials:

```bash
cp .env.test .env.test.local
# Edit .env.test.local with real credentials
```

### Seed test data

```bash
# Via SQL (direct DB access):
psql $TEST_DATABASE_URL -f e2e/scripts/seed.sql

# Via API:
npx ts-node e2e/scripts/seed-api.ts
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run with UI (interactive)
npx playwright test --ui

# Run only smoke tests
npx playwright test --grep @smoke

# Run specific journey
npx playwright test e2e/tests/01-customer-lifecycle.spec.ts

# Run on specific browser
npx playwright test --project=chromium

# Run mobile tests
npx playwright test --grep @mobile --project=mobile-chrome

# Debug mode
npx playwright test --debug

# View last HTML report
npx playwright show-report
```

## Test Structure

```
e2e/
├── tests/                    # 20 test suites (200+ test cases)
│   ├── 01-customer-lifecycle.spec.ts
│   ├── 02-loan-lifecycle.spec.ts
│   ├── ...
│   └── 20-mobile-banking.spec.ts
├── pages/                    # ~40 Page Object Model classes
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── customers/
│   ├── lending/
│   ├── payments/
│   └── ...
├── helpers/
│   ├── db.ts                 # PostgreSQL query helpers
│   ├── auth.ts               # Authentication helpers
│   ├── api.ts                # API client for test setup
│   └── utils.ts              # General utilities
├── data/
│   ├── testUsers.ts          # Test user credentials
│   └── testData.ts           # Test data constants
├── fixtures/
│   └── index.ts              # Extended Playwright fixtures
└── scripts/
    ├── seed.sql              # SQL seed data
    └── seed-api.ts           # API-based seeding
```

## Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Officer | testuser | TestPass123! |
| Manager | testmanager | TestPass123! |
| Compliance | testcompliance | TestPass123! |
| Treasury | testtreasury | TestPass123! |
| Admin | testadmin | TestPass123! |

## CI/CD

Tests run automatically on:
- **Push to main/dev/staging**: Full suite (sharded across 3 workers)
- **Pull Request**: Smoke tests only (`@smoke` tag)
- **Nightly (2am UTC)**: Full suite + all browsers

See `.github/workflows/e2e.yml` for configuration.
