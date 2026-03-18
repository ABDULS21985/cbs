# Load Testing

This directory contains a lightweight local load harness for the CBS application.

## What It Does

- Starts the app with the `loadtest` profile
- Seeds one customer and one account
- Runs concurrent HTTP scenarios against representative endpoints
- Prints latency and throughput summary
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

- The harness uses the `loadtest` Spring profile to bypass external OAuth dependencies safely for local benchmarking.
- It assumes local PostgreSQL and Redis are available, matching the repo's existing local test setup.
- Write scenarios intentionally create data. Use them selectively.
