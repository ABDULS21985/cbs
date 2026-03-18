import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULTS = {
  baseUrl: process.env.BASE_URL || "http://localhost:8080/api",
  intervalMs: Number(process.env.METRICS_INTERVAL_MS || 1000),
  output: process.env.METRICS_OUTPUT || "",
  timeoutMs: Number(process.env.METRICS_TIMEOUT_MS || 5000),
};

const METRIC_SPECS = [
  { key: "processCpuUsage", pathname: "/actuator/metrics/process.cpu.usage", statistic: "VALUE" },
  { key: "systemCpuUsage", pathname: "/actuator/metrics/system.cpu.usage", statistic: "VALUE" },
  { key: "jvmThreadsLive", pathname: "/actuator/metrics/jvm.threads.live", statistic: "VALUE" },
  { key: "jvmHeapUsedBytes", pathname: "/actuator/metrics/jvm.memory.used?tag=area:heap", statistic: "VALUE" },
  { key: "hikariActive", pathname: "/actuator/metrics/hikaricp.connections.active?tag=pool:cbs-hikari-pool", statistic: "VALUE" },
  { key: "hikariIdle", pathname: "/actuator/metrics/hikaricp.connections.idle?tag=pool:cbs-hikari-pool", statistic: "VALUE" },
  { key: "hikariMax", pathname: "/actuator/metrics/hikaricp.connections.max?tag=pool:cbs-hikari-pool", statistic: "VALUE" },
  { key: "hikariPending", pathname: "/actuator/metrics/hikaricp.connections.pending?tag=pool:cbs-hikari-pool", statistic: "VALUE" },
  { key: "executorActive", pathname: "/actuator/metrics/executor.active?tag=name:applicationTaskExecutor", statistic: "VALUE" },
  { key: "executorQueued", pathname: "/actuator/metrics/executor.queued?tag=name:applicationTaskExecutor", statistic: "VALUE" },
  { key: "customerGetCount", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/%7BcustomerId%7D&tag=method:GET", statistic: "COUNT" },
  { key: "customerGetTotalTimeSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/%7BcustomerId%7D&tag=method:GET", statistic: "TOTAL_TIME" },
  { key: "customerGetMaxSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/%7BcustomerId%7D&tag=method:GET", statistic: "MAX" },
  { key: "accountGetCount", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/accounts/%7BaccountNumber%7D&tag=method:GET", statistic: "COUNT" },
  { key: "accountGetTotalTimeSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/accounts/%7BaccountNumber%7D&tag=method:GET", statistic: "TOTAL_TIME" },
  { key: "accountGetMaxSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/accounts/%7BaccountNumber%7D&tag=method:GET", statistic: "MAX" },
  { key: "customerSearchCount", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/quick-search&tag=method:GET", statistic: "COUNT" },
  { key: "customerSearchTotalTimeSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/quick-search&tag=method:GET", statistic: "TOTAL_TIME" },
  { key: "customerSearchMaxSeconds", pathname: "/actuator/metrics/http.server.requests?tag=uri:/v1/customers/quick-search&tag=method:GET", statistic: "MAX" },
];

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
      case "--interval-ms":
        config.intervalMs = Number(next);
        index += 1;
        break;
      case "--timeout-ms":
        config.timeoutMs = Number(next);
        index += 1;
        break;
      case "--output":
        config.output = next;
        index += 1;
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

function getMeasurementValue(payload, statistic) {
  const measurement = Array.isArray(payload?.measurements)
    ? payload.measurements.find((item) => item.statistic === statistic)
    : null;
  return measurement?.value ?? null;
}

async function fetchMetric(baseUrl, pathname, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function sampleOnce(config) {
  const values = {};
  const errors = {};

  await Promise.all(METRIC_SPECS.map(async (spec) => {
    try {
      const payload = await fetchMetric(config.baseUrl, spec.pathname, config.timeoutMs);
      values[spec.key] = getMeasurementValue(payload, spec.statistic);
    } catch (error) {
      errors[spec.key] = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      values[spec.key] = null;
    }
  }));

  return {
    capturedAt: new Date().toISOString(),
    values,
    errors,
  };
}

function maxOf(samples, key) {
  return samples.reduce((max, sample) => {
    const value = sample.values[key];
    return typeof value === "number" && value > max ? value : max;
  }, Number.NEGATIVE_INFINITY);
}

function summarizeHttp(samples, countKey, totalTimeKey, maxKey) {
  if (samples.length < 2) {
    return null;
  }

  const first = samples[0].values;
  const last = samples[samples.length - 1].values;
  const deltaCount = (last[countKey] ?? 0) - (first[countKey] ?? 0);
  const deltaTotalTimeSeconds = (last[totalTimeKey] ?? 0) - (first[totalTimeKey] ?? 0);

  return {
    requestCountDelta: deltaCount,
    averageLatencyMs: deltaCount > 0 ? (deltaTotalTimeSeconds / deltaCount) * 1000 : null,
    peakObservedMaxMs: maxOf(samples, maxKey) * 1000,
  };
}

async function writeOutput(config, startedAt, samples) {
  const outputDir = path.join(process.cwd(), "load-tests", "results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = config.output || path.join(outputDir, `metrics-report-${nowIsoFile()}.json`);

  const report = {
    startedAt,
    endedAt: new Date().toISOString(),
    intervalMs: config.intervalMs,
    sampleCount: samples.length,
    summary: {
      maxProcessCpuUsage: maxOf(samples, "processCpuUsage"),
      maxSystemCpuUsage: maxOf(samples, "systemCpuUsage"),
      maxJvmThreadsLive: maxOf(samples, "jvmThreadsLive"),
      maxJvmHeapUsedBytes: maxOf(samples, "jvmHeapUsedBytes"),
      hikariConfiguredMax: maxOf(samples, "hikariMax"),
      maxHikariActive: maxOf(samples, "hikariActive"),
      maxHikariIdle: maxOf(samples, "hikariIdle"),
      maxHikariPending: maxOf(samples, "hikariPending"),
      maxExecutorActive: maxOf(samples, "executorActive"),
      maxExecutorQueued: maxOf(samples, "executorQueued"),
      customerGet: summarizeHttp(samples, "customerGetCount", "customerGetTotalTimeSeconds", "customerGetMaxSeconds"),
      accountGet: summarizeHttp(samples, "accountGetCount", "accountGetTotalTimeSeconds", "accountGetMaxSeconds"),
      customerSearch: summarizeHttp(samples, "customerSearchCount", "customerSearchTotalTimeSeconds", "customerSearchMaxSeconds"),
    },
    samples,
  };

  await writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(`Metrics report written to ${outputPath}`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const samples = [];
  const startedAt = new Date().toISOString();
  let running = true;

  const stop = () => {
    running = false;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    samples.push(await sampleOnce(config));
    await sleep(config.intervalMs);
  }

  await writeOutput(config, startedAt, samples);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
