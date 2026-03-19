# Load Testing

This directory contains a lightweight local load harness for the CBS application.

## What It Does

- Starts the app with the `loadtest` profile
- Seeds one customer and one account
- Runs concurrent HTTP scenarios against representative endpoints
- Warms each scenario before measuring to avoid first-hit initialization skew
- Prints latency and throughput summary
- Optionally samples actuator metrics during the run
- Writes a JSON report into `load-tests/results/`

## Default Scenarios

- `health`
- `customer-get`
- `account-get`

Optional scenarios:

- `openapi-docs`
- `customer-search`
- `customer-create` with `--enable-writes`

## Quick Start

```bash
export JAVA_HOME='/tmp/cba-jdk/jdk-21.0.10+7/Contents/Home'
export PATH="$JAVA_HOME/bin:$PATH"
./load-tests/run-local.sh --duration 10 --connections 8
```

## Custom Run

```bash
./load-tests/run-local.sh \
  --duration 20 \
  --connections 20 \
  --warmup-requests 1 \
  --collect-metrics \
  --scenarios health,customer-get,account-get,customer-search
```

To include write load:

```bash
./load-tests/run-local.sh \
  --duration 15 \
  --connections 10 \
  --scenarios customer-create \
  --enable-writes
```

## Notes

- Normal backend startup should not use `loadtest`; the default application profile keeps real OAuth/JWT security enabled.
- The harness uses the `loadtest` Spring profile to bypass external OAuth dependencies safely for local benchmarking.
- The `loadtest` profile also opts into synthetic/internal provider behavior that is blocked by default elsewhere in the application.
- It assumes local PostgreSQL and Redis are available, matching the repo's existing local test setup.
- Write scenarios intentionally create data. Use them selectively.
- Reports include sample error messages when requests fail or time out.
- With `--collect-metrics`, the harness also writes a metrics report with CPU, thread, Hikari, executor, and per-endpoint actuator summaries.
