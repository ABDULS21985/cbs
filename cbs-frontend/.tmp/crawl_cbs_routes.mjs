import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import pkg from 'pg';
const { Client } = pkg;

const FRONTEND_DIR = '/Users/mac/codes/cba/cbs-frontend';
const ROUTER_PATH = path.join(FRONTEND_DIR, 'src/app/router.tsx');
const OUT_PATH = '/tmp/cba-route-crawl.json';
const BASE_URL = 'http://localhost:3000';
const API_ORIGIN = 'http://127.0.0.1:8081';
const USERNAME = 'endpointdiag';
const PASSWORD = 'EndpointDiag123!';

function normalizePath(p) {
  if (!p) return '/';
  let out = p.replace(/\/+/g, '/');
  if (!out.startsWith('/')) out = '/' + out;
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function joinPath(parent, child) {
  if (!child) return normalizePath(parent || '/');
  if (child.startsWith('/')) return normalizePath(child);
  return normalizePath(`${parent || ''}/${child}`);
}

function parseRoutes() {
  const lines = fs.readFileSync(ROUTER_PATH, 'utf8').split(/\r?\n/);
  const stack = [];
  const routes = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.includes('<Route')) {
      if (line.startsWith('</Route>') && stack.length) stack.pop();
      continue;
    }

    const pathMatch = line.match(/path="([^"]+)"/);
    const hasIndex = /\bindex\b/.test(line);
    const isSelfClosing = line.endsWith('/>') || line.includes('/>');
    const isOutletGroup = /element=\{<Outlet\s*\/>\}/.test(line) || /element=\{<PortalLayout\s*\/>\}/.test(line);
    const currentBase = stack.length ? stack[stack.length - 1] : '';

    if (hasIndex) routes.add(normalizePath(currentBase || '/'));

    if (pathMatch) {
      const routePath = pathMatch[1];
      const fullPath = routePath === '*' ? '*' : joinPath(currentBase, routePath);
      if (routePath !== '*') routes.add(fullPath);
      if (!isSelfClosing && isOutletGroup) stack.push(fullPath);
    } else if (!isSelfClosing) {
      stack.push(currentBase);
    }
  }

  return [...routes]
    .filter((p) => p !== '*' && !p.startsWith('/portal'))
    .filter((p) => !['/login', '/mfa', '/forgot-password', '/reset-password', '/forbidden', '/error'].includes(p))
    .sort();
}

async function sampleValue(client, sql, fallback = null) {
  try {
    const result = await client.query(sql);
    return result.rows[0] ? Object.values(result.rows[0])[0] : fallback;
  } catch {
    return fallback;
  }
}

async function getSamples() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'cbs_admin',
    password: 'cbs_password',
    database: 'cbs',
  });
  await client.connect();
  const samples = {
    customerId: await sampleValue(client, 'select id::text from cbs.customer order by id limit 1'),
    accountId: await sampleValue(client, 'select id::text from cbs.account order by id limit 1'),
    fixedDepositId: await sampleValue(client, 'select id::text from cbs.fixed_deposit order by id limit 1'),
    goalId: await sampleValue(client, 'select id::text from cbs.savings_goal order by id limit 1'),
    recurringDepositId: await sampleValue(client, 'select id::text from cbs.recurring_deposit order by id limit 1'),
    virtualAccountId: await sampleValue(client, 'select id::text from cbs.virtual_account order by id limit 1'),
    loanId: await sampleValue(client, 'select id::text from cbs.loan_application order by id limit 1'),
    facilityId: await sampleValue(client, 'select id::text from cbs.credit_facility order by id limit 1'),
    collateralId: await sampleValue(client, 'select id::text from cbs.collateral order by id limit 1'),
    mortgageId: await sampleValue(client, 'select id::text from cbs.mortgage_loan order by id limit 1'),
    leaseId: await sampleValue(client, 'select id::text from cbs.lease_contract order by id limit 1'),
    standingOrderId: await sampleValue(client, 'select id::text from cbs.standing_instruction order by id limit 1'),
    cardId: await sampleValue(client, 'select id::text from cbs.card order by id limit 1'),
    capitalMarketCode: await sampleValue(client, 'select code::text from cbs.capital_market_deal order by id limit 1'),
    returnId: await sampleValue(client, 'select id::text from cbs.regulatory_return order by id limit 1'),
    productId: await sampleValue(client, 'select id::text from cbs.product order by id limit 1'),
    feeId: await sampleValue(client, 'select id::text from cbs.fee_definition order by id limit 1'),
    providerId: await sampleValue(client, 'select id::text from cbs.service_provider order by id limit 1'),
    agreementId: await sampleValue(client, 'select id::text from cbs.agreement order by id limit 1'),
    caseId: await sampleValue(client, 'select id::text from cbs.customer_case order by id limit 1'),
    wealthCode: await sampleValue(client, 'select plan_code::text from cbs.wealth_management_plan order by id limit 1'),
    reportId: await sampleValue(client, 'select report_id::text from cbs.custom_report order by report_id limit 1'),
  };
  await client.end();
  return samples;
}

function materializeRoutes(routes, samples) {
  const out = [];
  for (const route of routes) {
    let materialized = route;
    if (route.includes(':')) {
      const replacements = [
        [/^\/customers\/:id$/, samples.customerId],
        [/^\/accounts\/:id$/, samples.accountId],
        [/^\/accounts\/:id\/maintenance$/, samples.accountId],
        [/^\/accounts\/fixed-deposits\/:id$/, samples.fixedDepositId],
        [/^\/accounts\/goals\/:id$/, samples.goalId],
        [/^\/accounts\/recurring-deposits\/:id$/, samples.recurringDepositId],
        [/^\/accounts\/virtual-accounts\/:id$/, samples.virtualAccountId],
        [/^\/lending\/:id$/, samples.loanId],
        [/^\/lending\/:id\/repay$/, samples.loanId],
        [/^\/lending\/:id\/restructure$/, samples.loanId],
        [/^\/lending\/facilities\/:id$/, samples.facilityId],
        [/^\/lending\/collateral\/:id$/, samples.collateralId],
        [/^\/lending\/mortgages\/:id$/, samples.mortgageId],
        [/^\/lending\/leases\/:id$/, samples.leaseId],
        [/^\/payments\/standing-orders\/:id$/, samples.standingOrderId],
        [/^\/cards\/:id$/, samples.cardId],
        [/^\/capital-markets\/:id$/, samples.capitalMarketCode],
        [/^\/compliance\/returns\/:id$/, samples.returnId],
        [/^\/reports\/custom\/:id\/view$/, samples.reportId],
        [/^\/admin\/products\/:id$/, samples.productId],
        [/^\/admin\/fees\/:id$/, samples.feeId],
        [/^\/admin\/providers\/:id$/, samples.providerId],
        [/^\/agreements\/:id$/, samples.agreementId],
        [/^\/cases\/:id$/, samples.caseId],
        [/^\/wealth\/:code$/, samples.wealthCode],
      ];
      let matched = false;
      for (const [pattern, value] of replacements) {
        if (pattern.test(route) && value) {
          materialized = route.replace(/:[^/]+/g, value);
          matched = true;
          break;
        }
      }
      if (!matched) continue;
    }
    out.push(materialized);
  }
  return [...new Set(out)];
}

async function main() {
  const routes = parseRoutes();
  const samples = await getSamples();
  const materializedRoutes = materializeRoutes(routes, samples);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const url = `${API_ORIGIN}${requestUrl.pathname}${requestUrl.search}`;
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
  const page = await context.newPage();

  const log = {
    generatedAt: new Date().toISOString(),
    samples,
    routesDiscovered: routes,
    routesVisited: [],
    responses: [],
    pageErrors: [],
    consoleErrors: [],
  };

  let currentRoute = 'bootstrap';

  page.on('pageerror', (err) => {
    log.pageErrors.push({ route: currentRoute, message: String(err) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      log.consoleErrors.push({ route: currentRoute, text: msg.text() });
    }
  });
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/')) return;
    const req = response.request();
    log.responses.push({
      route: currentRoute,
      method: req.method(),
      url,
      status: response.status(),
      ok: response.ok(),
    });
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('[name=username]', USERNAME);
  await page.fill('[name=password]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
    page.click('button[type=submit]'),
  ]);
  await page.waitForTimeout(3000);

  for (const route of materializedRoutes) {
    currentRoute = route;
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3500);
      log.routesVisited.push({ route, success: true, finalUrl: page.url(), title: await page.title() });
    } catch (error) {
      log.routesVisited.push({ route, success: false, error: String(error), finalUrl: page.url() });
    }
  }

  await browser.close();
  fs.writeFileSync(OUT_PATH, JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ routesDiscovered: routes.length, routesVisited: materializedRoutes.length, output: OUT_PATH }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
