#!/bin/bash

# Script to run Supabase migrations for Purchasing Module
# Usage: ./scripts/run-migrations.sh

set -e

echo "🚀 Running Supabase Migrations for Purchasing Module"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

MIGRATIONS_DIR="supabase/migrations"

# Migration files in order
MIGRATIONS=(
    "20250419_purchasing_module.sql"
    "20250419_purchase_order.sql"
    "20250419_notifications.sql"
)

echo ""
echo "📋 Available migrations to run:"
echo "=================================================="

for file in "${MIGRATIONS[@]}"; do
    filepath="$MIGRATIONS_DIR/$file"
    if [ -f "$filepath" ]; then
        lines=$(wc -l < "$filepath")
        echo -e "${GREEN}✓${NC} $file ($lines lines)"
    else
        echo -e "${RED}✗${NC} $file (not found)"
    fi
done

echo ""
echo "=================================================="
echo "Instructions to run migrations:"
echo ""
echo "Method 1: Via Supabase Dashboard (Recommended)"
echo "  1. Open https://app.supabase.com"
echo "  2. Select your talentpool project"
echo "  3. Go to SQL Editor > New query"
echo "  4. Copy and paste content from:"
echo ""

for file in "${MIGRATIONS[@]}"; do
    echo "     $file:"
    echo "     cat $MIGRATIONS_DIR/$file | pbcopy"
    echo ""
done

echo "Method 2: Via psql (if you have connection string)"
echo "  psql \"postgresql://...\" -f $MIGRATIONS_DIR/20250419_purchasing_module.sql"
echo ""

echo "=================================================="
echo -e "${YELLOW}Migration order (run in this sequence):${NC}"
echo "  1. 20250419_purchasing_module.sql"
echo "     → Base schema: departments, vendors, purchase_requests, pr_items"
echo ""
echo "  2. 20250419_purchase_order.sql"
echo "     → PO tables: purchase_orders, po_items, goods_receipts, gr_items"
echo ""
echo "  3. 20250419_notifications.sql"
echo "     → Notification system: notifications table"
echo ""
echo -e "${GREEN}✅ Script ready!${NC}"
