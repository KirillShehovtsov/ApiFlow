#!/bin/sh
set -e

echo "Waiting for SQL Server..."
until nc -z db 1433; do
  sleep 2
done
sleep 3

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting ApiFlow server..."
exec "$@"
