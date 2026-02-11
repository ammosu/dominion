#!/bin/sh
set -e

# Render sets PORT environment variable, but nginx needs to listen on it
# Default to 80 for local docker-compose
export PORT=${PORT:-80}
export BACKEND_URL=${BACKEND_URL:-http://backend:3000}

echo "================================"
echo "Starting Dominion Frontend"
echo "================================"
echo "PORT: $PORT"
echo "BACKEND_URL: $BACKEND_URL"
echo "================================"

# Replace environment variables in nginx config
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Show generated config for debugging
echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
