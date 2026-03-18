#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-18080}"
BASE_URL="${BASE_URL:-http://localhost:${PORT}/api}"
APP_LOG="${APP_LOG:-${ROOT_DIR}/load-tests/results/app.log}"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-180}"
COLLECT_METRICS=0
METRICS_INTERVAL_MS="${METRICS_INTERVAL_MS:-1000}"
LOAD_ARGS=()

mkdir -p "${ROOT_DIR}/load-tests/results"

cd "${ROOT_DIR}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --collect-metrics)
      COLLECT_METRICS=1
      shift
      ;;
    --metrics-interval-ms)
      METRICS_INTERVAL_MS="$2"
      shift 2
      ;;
    *)
      LOAD_ARGS+=("$1")
      shift
      ;;
  esac
done

./gradlew bootRun --args="--spring.profiles.active=loadtest --server.port=${PORT}" >"${APP_LOG}" 2>&1 &
APP_PID=$!
METRICS_PID=""

cleanup() {
  if [[ -n "${METRICS_PID}" ]] && kill -0 "${METRICS_PID}" >/dev/null 2>&1; then
    kill "${METRICS_PID}" >/dev/null 2>&1 || true
    wait "${METRICS_PID}" >/dev/null 2>&1 || true
  fi
  if kill -0 "${APP_PID}" >/dev/null 2>&1; then
    kill "${APP_PID}" >/dev/null 2>&1 || true
    wait "${APP_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

READY=0
for ((i = 0; i < STARTUP_TIMEOUT_SECONDS; i += 2)); do
  if curl -sf "${BASE_URL}/actuator/health" >/dev/null; then
    READY=1
    break
  fi
  sleep 2
done

if [[ "${READY}" -ne 1 ]]; then
  echo "Application did not become healthy in time. Recent boot log:" >&2
  tail -n 100 "${APP_LOG}" >&2 || true
  exit 1
fi

if [[ "${COLLECT_METRICS}" -eq 1 ]]; then
  node "${ROOT_DIR}/load-tests/collect-metrics.mjs" \
    --base-url "${BASE_URL}" \
    --interval-ms "${METRICS_INTERVAL_MS}" &
  METRICS_PID=$!
fi

node "${ROOT_DIR}/load-tests/run-load.mjs" --base-url "${BASE_URL}" "${LOAD_ARGS[@]}"

if [[ -n "${METRICS_PID}" ]] && kill -0 "${METRICS_PID}" >/dev/null 2>&1; then
  kill "${METRICS_PID}" >/dev/null 2>&1 || true
  wait "${METRICS_PID}" >/dev/null 2>&1 || true
fi
