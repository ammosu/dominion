#!/bin/sh
set -e

# Set defaults
export PORT=${PORT:-80}
export BACKEND_URL=${BACKEND_URL:-http://backend:3000}

echo "Starting nginx with configuration:"
echo "  PORT: $PORT"
echo "  BACKEND_URL: $BACKEND_URL"

# Replace environment variables in nginx config
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
