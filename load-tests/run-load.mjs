import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";

const DEFAULTS = {
  baseUrl: process.env.BASE_URL || "http://localhost:8080/api",
  durationSeconds: Number(process.env.DURATION || 15),
  connections: Number(process.env.CONNECTIONS || 12),
  timeoutMs: Number(process.env.TIMEOUT_MS || 10000),
  scenarios: (process.env.SCENARIOS || "health,customer-get,account-get").split(",").map((value) => value.trim()).filter(Boolean),
  enableWrites: ["1", "true", "yes"].includes(String(process.env.ENABLE_WRITES || "").toLowerCase()),
};

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--base-url":
        config.baseUrl = next;
        index += 1;
        break;
      case "--duration":
        config.durationSeconds = Number(next);
        index += 1;
        break;
      case "--connections":
        config.connections = Number(next);
        index += 1;
        break;
      case "--timeout-ms":
        config.timeoutMs = Number(next);
        index += 1;
        break;
      case "--scenarios":
        config.scenarios = next.split(",").map((value) => value.trim()).filter(Boolean);
        index += 1;
        break;
      case "--enable-writes":
        config.enableWrites = true;
        break;
      default:
        break;
    }
  }
  return config;
}

function nowIsoFile() {
  return new Date().toISOString().replace(/[:]/g, "-");
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) {
    return 0;
  }
  const position = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1));
  return sortedValues[position];
}

function summarizeLatencies(latenciesMs) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    minMs: sorted[0] || 0,
    avgMs: sorted.length ? sum / sorted.length : 0,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    maxMs: sorted[sorted.length - 1] || 0,
  };
}

function jsonHeaders() {
  return {
    "content-type": "application/json",
    accept: "application/json",
  };
}

let uniqueCounter = 0;

function uniqueEmail(prefix) {
  uniqueCounter += 1;
  return `${prefix}+${Date.now()}-${uniqueCounter}@example.com`;
}

function uniquePhone() {
  uniqueCounter += 1;
  const suffix = `${Date.now()}${uniqueCounter}`.slice(-10);
  return `+234${suffix}`;
}

async function sendJson(baseUrl, pathname, payload, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return { response, text, json: text ? JSON.parse(text) : null };
  } finally {
    clearTimeout(timeout);
  }
}

async function seedData(baseUrl, timeoutMs) {
  const customerPayload = {
    customerType: "INDIVIDUAL",
    firstName: "Load",
    lastName: "Seed",
    dateOfBirth: "1990-01-01",
    nationality: "NGA",
    email: uniqueEmail("load.seed"),
    phonePrimary: uniquePhone(),
    branchCode: "BR001",
  };
  const customerResult = await sendJson(baseUrl, "/v1/customers", customerPayload, timeoutMs);
  if (!customerResult.response.ok) {
    throw new Error(`Customer seed failed: ${customerResult.response.status} ${customerResult.text}`);
  }

  const customerId = customerResult.json?.data?.id;
  if (!customerId) {
    throw new Error(`Customer seed did not return id: ${customerResult.text}`);
  }

  const accountPayload = {
    customerId,
    productCode: "SA-STD",
    accountType: "INDIVIDUAL",
    accountName: "Load Test Seed Account",
    currencyCode: "NGN",
    branchCode: "BR001",
    initialDeposit: 1000.0,
  };
  const accountResult = await sendJson(baseUrl, "/v1/accounts", accountPayload, timeoutMs);
  if (!accountResult.response.ok) {
    throw new Error(`Account seed failed: ${accountResult.response.status} ${accountResult.text}`);
  }

  const accountNumber = accountResult.json?.data?.accountNumber;
  if (!accountNumber) {
    throw new Error(`Account seed did not return accountNumber: ${accountResult.text}`);
  }

  return { customerId, accountNumber };
}

async function hitEndpoint(baseUrl, scenario, context, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const pathValue = typeof scenario.path === "function" ? scenario.path(context) : scenario.path;
    const bodyValue = typeof scenario.body === "function" ? scenario.body(context) : scenario.body;
    const headersValue = typeof scenario.headers === "function" ? scenario.headers(context) : scenario.headers;
    const response = await fetch(`${baseUrl}${pathValue}`, {
      method: scenario.method,
      headers: headersValue,
      body: bodyValue ? JSON.stringify(bodyValue) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    return { status: response.status, ok: response.ok, bytes: Buffer.byteLength(text, "utf8") };
  } finally {
    clearTimeout(timeout);
  }
}

async function runScenario(baseUrl, scenario, context, options) {
  const startedAt = performance.now();
  const deadline = startedAt + options.durationSeconds * 1000;
  const latenciesMs = [];
  const statuses = new Map();
  let requests = 0;
  let errors = 0;
  let non2xx = 0;
  let bytes = 0;

  async function worker() {
    while (performance.now() < deadline) {
      const requestStarted = performance.now();
      try {
        const result = await hitEndpoint(baseUrl, scenario, context, options.timeoutMs);
        requests += 1;
        bytes += result.bytes;
        statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
        if (!result.ok) {
          non2xx += 1;
        }
      } catch (error) {
        errors += 1;
      } finally {
        latenciesMs.push(performance.now() - requestStarted);
      }
    }
  }

  await Promise.all(Array.from({ length: options.connections }, () => worker()));

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  return {
    name: scenario.name,
    method: scenario.method,
    durationSeconds: elapsedSeconds,
    connections: options.connections,
    requests,
    requestsPerSecond: elapsedSeconds > 0 ? requests / elapsedSeconds : 0,
    errors,
    non2xx,
    bytes,
    latencies: summarizeLatencies(latenciesMs),
    statuses: Object.fromEntries([...statuses.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
  };
}

function scenarioCatalog(enableWrites) {
  const scenarios = {
    health: {
      name: "health",
      method: "GET",
      path: "/actuator/health",
    },
    "openapi-docs": {
      name: "openapi-docs",
      method: "GET",
      path: "/v3/api-docs",
    },
    "customer-get": {
      name: "customer-get",
      method: "GET",
      path: (context) => `/v1/customers/${context.customerId}`,
    },
    "account-get": {
      name: "account-get",
      method: "GET",
      path: (context) => `/v1/accounts/${context.accountNumber}`,
    },
    "customer-search": {
      name: "customer-search",
      method: "GET",
      path: "/v1/customers/quick-search?q=Load",
    },
  };

  if (enableWrites) {
    scenarios["customer-create"] = {
      name: "customer-create",
      method: "POST",
      path: "/v1/customers",
      headers: () => jsonHeaders(),
      body: () => ({
        customerType: "INDIVIDUAL",
        firstName: "Load",
        lastName: "Write",
        dateOfBirth: "1990-01-01",
        nationality: "NGA",
        email: uniqueEmail("load.write"),
        phonePrimary: uniquePhone(),
        branchCode: "BR001",
      }),
    };
  }

  return scenarios;
}

function printSummary(results, options) {
  console.log("");
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Duration: ${options.durationSeconds}s per scenario | Connections: ${options.connections}`);
  console.log("");
  console.log("Scenario           Req     RPS    Err  Non2xx   Avg ms   P95 ms   P99 ms   Max ms");
  console.log("-----------------------------------------------------------------------------------");
  for (const result of results) {
    console.log(
      `${result.name.padEnd(16)} ${String(result.requests).padStart(6)} ${result.requestsPerSecond.toFixed(1).padStart(7)} ${String(result.errors).padStart(6)} ${String(result.non2xx).padStart(8)} ${result.latencies.avgMs.toFixed(1).padStart(8)} ${result.latencies.p95Ms.toFixed(1).padStart(8)} ${result.latencies.p99Ms.toFixed(1).padStart(8)} ${result.latencies.maxMs.toFixed(1).padStart(8)}`
    );
  }
  console.log("");
}

async function writeReport(results, options, seed) {
  const outputDir = path.join(process.cwd(), "load-tests", "results");
  await mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `load-report-${nowIsoFile()}.json`);
  await writeFile(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    options,
    seed,
    results,
  }, null, 2));
  console.log(`Report written to ${reportPath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = scenarioCatalog(options.enableWrites);
  const selectedScenarios = options.scenarios.map((name) => catalog[name]).filter(Boolean);
  if (selectedScenarios.length === 0) {
    throw new Error(`No valid scenarios selected. Available: ${Object.keys(catalog).join(", ")}`);
  }

  console.log(`Seeding baseline data against ${options.baseUrl} ...`);
  const seed = await seedData(options.baseUrl, options.timeoutMs);
  console.log(`Seeded customerId=${seed.customerId}, accountNumber=${seed.accountNumber}`);

  const results = [];
  for (const scenario of selectedScenarios) {
    console.log(`Running scenario ${scenario.name} ...`);
    results.push(await runScenario(options.baseUrl, scenario, seed, options));
  }

  printSummary(results, options);
  await writeReport(results, options, seed);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
