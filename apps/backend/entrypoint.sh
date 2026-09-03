#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx tsx node_modules/knex/bin/cli.js --knexfile knexfile.ts migrate:latest

echo "[entrypoint] Starting WMS API..."
exec node dist/server.js
