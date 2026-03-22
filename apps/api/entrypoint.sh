#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Running seed (if needed)..."
npx prisma db seed || true

echo "🚀 Starting application..."
node dist/main.js
