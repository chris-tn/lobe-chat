#!/bin/bash

# Script to fix admin access for user
# Run this after starting your docker-compose

echo "🔧 Fixing admin access for user f659efd8-7420-4c7e-9f3e-30cc7818b19b"
echo ""

# Get database name from .env
DB_NAME=$(grep "^LOBE_DB_NAME=" .env 2>/dev/null | cut -d '=' -f2)
if [ -z "$DB_NAME" ]; then
    echo "⚠️  Warning: Could not find LOBE_DB_NAME in .env, using default 'lobechat'"
    DB_NAME="lobechat"
fi

echo "Database: $DB_NAME"
echo ""

# Update user in database
echo "📝 Updating user to admin..."
docker exec lobe-postgres psql -U postgres -d "$DB_NAME" -c "UPDATE users SET is_admin = true WHERE id = 'f659efd8-7420-4c7e-9f3e-30cc7818b19b';"

echo ""
echo "✅ Verifying the change..."
docker exec lobe-postgres psql -U postgres -d "$DB_NAME" -c "SELECT id, email, full_name, is_admin FROM users WHERE id = 'f659efd8-7420-4c7e-9f3e-30cc7818b19b';"

echo ""
echo "✨ Done! Please refresh your browser and try again."









