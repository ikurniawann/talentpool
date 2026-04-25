#!/bin/bash

# ============================================================
# Script: Reset Database - Truncate All Purchasing Data
# Usage: ./scripts/reset-db.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}  RESET DATABASE - TRUNCATE ALL DATA${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

# Check .env.local
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local not found!${NC}"
    exit 1
fi

# Extract credentials
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2)
SUPABASE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${RED}Error: Supabase credentials not found!${NC}"
    exit 1
fi

# Extract database host
DB_HOST=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|.supabase.co||')
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="6543"

PSQL_CONN="postgresql://${DB_USER}.${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${GREEN}Database: ${DB_HOST}.supabase.co${NC}"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will DELETE ALL purchasing data!${NC}"
echo ""
echo "Tables to truncate:"
echo "  ✓ purchase_return_items, purchase_returns"
echo "  ✓ inventory_movements, inventory"
echo "  ✓ qc_inspections"
echo "  ✓ grn_items, grn"
echo "  ✓ deliveries"
echo "  ✓ purchase_order_items, purchase_orders"
echo "  ✓ supplier_price_lists"
echo "  ✓ bom"
echo "  ✓ produk"
echo "  ✓ bahan_baku"
echo "  ✓ suppliers"
echo "  ✓ satuan"
echo ""
echo -e "${YELLOW}Note: Users, brands, positions will NOT be deleted.${NC}"
echo ""

# Confirm
read -p "Continue? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Running truncate...${NC}"
echo ""

# Run truncate_all.sql
SCRIPT_PATH="$(dirname "$0")/truncate_data/00_truncate_all.sql"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}Error: Script not found at $SCRIPT_PATH${NC}"
    exit 1
fi

# Execute via psql
PGPASSWORD="${SUPABASE_KEY}" psql "$PSQL_CONN" -f "$SCRIPT_PATH"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ DATABASE RESET COMPLETE${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Refresh your browser to see empty tables!"
echo ""
