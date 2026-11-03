#!/bin/sh
# Copyright (c) 2026 Flisk Landscape contributors
# SPDX-License-Identifier: MIT
set -e

# =============================================================================
# CRITICAL FIX: Bun concurrency and DNS settings for Docker/Colima
# These prevent "Resolving dependencies" hang
# =============================================================================
export BUN_INSTALL_CONCURRENCY=4          # Default is 16+, reduce for Docker
export UV_THREADPOOL_SIZE=4               # Limit threads (default is 128)
export BUN_NETWORK_TIMEOUT=30000          # 30s timeout per request
export BUN_RESOLVE_TIMEOUT=60000          # 60s for resolution phase

# DNS fixes for Colima/Docker
export NODE_OPTIONS="--dns-result-order=ipv4first"

start_ts=$(date +%s)
echo "⏱️ install-deps start: $(date '+%Y-%m-%d %H:%M:%S %z')"
echo "🔧 Bun concurrency: $BUN_INSTALL_CONCURRENCY, Threadpool: $UV_THREADPOOL_SIZE"

finish_install_timer() {
  end_ts=$(date +%s)
  echo "install-deps duration: $((end_ts-start_ts))s"
}
trap 'finish_install_timer' EXIT INT TERM

export NODE_ENV=development

# Use persistent cache directory (Docker layer, not mount)
export BUN_INSTALL_CACHE_DIR=/cache/bun
mkdir -p $BUN_INSTALL_CACHE_DIR

# =============================================================================
# Check Verdaccio registry (premium feature — only required when VERDACCIO_LICENSE_KEY is set)
# Without a license key, skip Verdaccio and fall back to public npm registry.
# =============================================================================
if [ -z "${FLISK_LICENSE_KEY:-}" ]; then
  echo "ℹ️  FLISK_LICENSE_KEY not set — skipping private registry (public npm only)"
  VERDACCIO_URL=""
else
  VERDACCIO_URL="http://localhost:4873"
  echo "🔍 Checking Verdaccio registry at $VERDACCIO_URL..."
  if ! wget -q --spider --timeout=3 "$VERDACCIO_URL" 2>/dev/null; then
    VERDACCIO_URL="http://host.docker.internal:4873"
    echo "   localhost unreachable, trying $VERDACCIO_URL..."
    if ! wget -q --spider --timeout=3 "$VERDACCIO_URL" 2>/dev/null; then
      echo "❌ Verdaccio not reachable at localhost:4873 or host.docker.internal:4873. Build will fail."
      echo "   Ensure Verdaccio is running: docker ps | grep verdaccio"
      exit 1
    fi
  fi
  echo "✅ Verdaccio available at $VERDACCIO_URL"
fi

# =============================================================================
# CRITICAL FIX: Reduced timeout for faster failure detection (was 900s)
# Using 60s to fail fast and retry, rather than hanging for 15 minutes
# =============================================================================
# CRITICAL FIX: Extended timeout for full dependency resolution
# 60s was too short - packages resolve but need time for transitive deps
INSTALL_TIMEOUT_SECONDS="${BUN_INSTALL_TIMEOUT_SECONDS:-300}"
echo "📦 Dependency install timeout: ${INSTALL_TIMEOUT_SECONDS}s (Verdaccio packages available)"

INSTALL_DEPS_VERBOSE="${INSTALL_DEPS_VERBOSE:-0}"
if [ "$INSTALL_DEPS_VERBOSE" = "1" ]; then
  echo "🚀 Installing dependencies (verbose)..."
  BUN_VERBOSE_FLAG="--verbose"
  FAIL_TAIL_LINES=200
else
  echo "📦 Installing dependencies..."
  BUN_VERBOSE_FLAG=""
  FAIL_TAIL_LINES=50
fi

BUN_INSTALL_LOG=/tmp/bun-install.log

# Start tail in background for live logging
touch "$BUN_INSTALL_LOG"
tail -n 20 -f "$BUN_INSTALL_LOG" 2>/dev/null &
TAIL_PID=$!
cleanup_tail() {
  kill "$TAIL_PID" 2>/dev/null || true
}
trap 'cleanup_tail; finish_install_timer' EXIT INT TERM

# =============================================================================
# Cache configuration: Use persistent Docker layer path
# =============================================================================
# Uses /cache/bun (persistent Docker layer path, not a mount).
# This avoids the "FileNotFound when create temporary directory" bug
# that occurs with Docker --mount=type=cache, while still persisting
# cache across rebuilds via Docker layer caching.
echo "🔧 Using /cache/bun for Bun cache (persistent Docker layer)..."
export BUN_CACHE_DIR="/cache/bun"
mkdir -p "$BUN_CACHE_DIR"
BUN_CACHE_FLAG="--cache-dir=/cache/bun"
echo "📁 Cache location: /cache/bun"

# =============================================================================
# Install function with timeout and logging
# Uses constrained concurrency to prevent "Resolving dependencies" hang
# =============================================================================
# =============================================================================
# Skip package versions published in the last day (#2895). The registry lists a new release before its CDN serves the
# tarball, so a build minutes after a release fails with "GET .../rollup-4.67.3.tgz - 404"; an older version that matches the
# same range installs instead. FLISK_MIN_RELEASE_AGE_SECONDS=0 turns it off. A Bun without the flag installs without it.
# =============================================================================
MIN_RELEASE_AGE_SECONDS="${FLISK_MIN_RELEASE_AGE_SECONDS:-86400}"
MIN_RELEASE_AGE_FLAG=""
if [ "$MIN_RELEASE_AGE_SECONDS" != "0" ] && bun install --help 2>&1 | grep -q -- "--minimum-release-age"; then
  MIN_RELEASE_AGE_FLAG="--minimum-release-age=$MIN_RELEASE_AGE_SECONDS"
  echo "🕒 Skipping package versions published in the last ${MIN_RELEASE_AGE_SECONDS}s"
fi

run_install() {
  local args="$1"
  local attempt="$2"

  echo "📌 Attempt $attempt: bun install $args $MIN_RELEASE_AGE_FLAG (concurrency: $BUN_INSTALL_CONCURRENCY)"
  set +e
  # Use timeout with explicit concurrency limit
  timeout "$INSTALL_TIMEOUT_SECONDS" \
    bun install $args \
    --concurrent-tasks "$BUN_INSTALL_CONCURRENCY" \
    --concurrent-scripts "$BUN_INSTALL_CONCURRENCY" \
    $MIN_RELEASE_AGE_FLAG $BUN_CACHE_FLAG $BUN_VERBOSE_FLAG >"$BUN_INSTALL_LOG" 2>&1
  local code=$?
  set -e
  return $code
}

# A registry hiccup (a tarball the CDN does not serve yet, a 5xx, a dropped connection, a stalled install) is worth another
# try; a package that does not exist (a 404 for its metadata, not a tarball) is not.
is_transient_install_failure() {
  [ "$1" -eq 124 ] && return 0
  grep -Eq -- "\.tgz - 404|- (408|429|5[0-9][0-9])([^0-9]|$)|ECONNRESET|ETIMEDOUT|ECONNREFUSED|ConnectionRefused|ConnectionClosed|timed out|socket hang up" "$BUN_INSTALL_LOG"
}

# =============================================================================
# Install with lockfile but allow updates within resolved ranges
# =============================================================================
MAX_ATTEMPTS="${FLISK_INSTALL_ATTEMPTS:-3}"
RETRY_DELAY_SECONDS="${FLISK_INSTALL_RETRY_DELAY:-15}"
ATTEMPT=1
INSTALL_CODE=0
TRANSIENT=0

while :; do
  INSTALL_CODE=0
  run_install "--force" $ATTEMPT || INSTALL_CODE=$?
  [ "$INSTALL_CODE" -eq 0 ] && break
  if [ -n "$MIN_RELEASE_AGE_FLAG" ] && grep -q "blocked by minimum-release-age" "$BUN_INSTALL_LOG"; then
    # A dependency pins a version newer than the minimum age: that version is what the service asks for, so allow it.
    echo "ℹ️  A dependency asks for a version published in the last ${MIN_RELEASE_AGE_SECONDS}s; installing without the minimum age"
    MIN_RELEASE_AGE_FLAG=""
  elif is_transient_install_failure "$INSTALL_CODE"; then
    TRANSIENT=1
    [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ] && break
    delay=$((ATTEMPT * RETRY_DELAY_SECONDS))
    echo "⚠️  bun install hit a registry or network error (attempt $ATTEMPT of $MAX_ATTEMPTS) - retrying in ${delay}s:"
    grep -E -- " - [0-9]{3}([^0-9]|$)|ECONN|timed out" "$BUN_INSTALL_LOG" | head -n 3 || true
    sleep "$delay"
  else
    TRANSIENT=0
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
done
ATTEMPT=$((ATTEMPT + 1))

cleanup_tail

# =============================================================================
# Final status check
# =============================================================================
if [ "$INSTALL_CODE" -ne 0 ]; then
  echo "❌ Dependency installation failed after $((ATTEMPT - 1)) attempts (exit $INSTALL_CODE). Last ${FAIL_TAIL_LINES} lines:"
  tail -n "$FAIL_TAIL_LINES" "$BUN_INSTALL_LOG"
  if [ "$TRANSIENT" -eq 1 ]; then
    echo "💡 The package registry or the network failed, not the service: this is usually transient (a version published"
    echo "   minutes ago is listed before its tarball is served). Run flisk up again in a few minutes."
  fi
  exit 1
fi

if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "❌ Dependency installation produced empty node_modules. Last ${FAIL_TAIL_LINES} lines:"
  tail -n "$FAIL_TAIL_LINES" "$BUN_INSTALL_LOG"
  exit 1
fi

echo "✅ Dependency installation complete"
if [ "$INSTALL_DEPS_VERBOSE" = "1" ]; then
  echo "📊 Total packages: $(ls node_modules 2>/dev/null | wc -l)"
  du -sh node_modules 2>/dev/null || true
fi

# No cache cleanup needed (--no-cache flag used)
