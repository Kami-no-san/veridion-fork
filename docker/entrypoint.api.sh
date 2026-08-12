#!/bin/sh
set -e

echo "🚀 Starting Veridion API..."

SCHEMA="${PRISMA_SCHEMA_PATH:-packages/database/prisma/schema.prisma}"

# Locate the Prisma CLI. pnpm nests it under the database package's bin;
# fall back to the root node_modules bin and `npx` as a last resort.
if [ -x "packages/database/node_modules/.bin/prisma" ]; then
  PRISMA="packages/database/node_modules/.bin/prisma"
elif [ -x "node_modules/.bin/prisma" ]; then
  PRISMA="node_modules/.bin/prisma"
else
  PRISMA="npx prisma"
fi

echo "⏳ Applying database schema (using: $PRISMA)..."

attempt=0
max_attempts=30
until $PRISMA db push --schema "$SCHEMA" --skip-generate --accept-data-loss; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "❌ Database not reachable after ${max_attempts} attempts. Exiting."
    exit 1
  fi
  echo "⏳ Database not ready yet (attempt ${attempt}/${max_attempts}) — retrying in 2s..."
  sleep 2
done

echo "✅ Database schema is up to date."

# Start the API server.
exec node apps/api/dist/main.js
