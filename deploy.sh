#!/bin/bash

set -e

PROJECT="/var/www/zood-yar"

echo "=== Starting Zood-Yar deployment ==="

cd "$PROJECT"

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Building frontend ==="
cd "$PROJECT/frontend"
npm install
npm run build

echo "=== Updating backend ==="
cd "$PROJECT/backend"
source venv/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput

echo "=== Restarting Django ==="
systemctl restart zood-yar

echo "=== Reloading Nginx ==="
systemctl reload nginx

echo "=== Deployment complete ==="
