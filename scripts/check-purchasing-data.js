#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhmmhpbxiygpznhpaspy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44'
);

async function checkData() {
  console.log('Checking purchasing data in Supabase...\n');

  const checks = [
    { table: 'satuan', label: 'Satuan' },
    { table: 'suppliers', label: 'Suppliers' },
    { table: 'bahan_baku', label: 'Bahan Baku' },
    { table: 'produk', label: 'Produk' },
    { table: 'departments', label: 'Departments' },
    { table: 'vendors', label: 'Vendors' },
    { table: 'purchase_requests', label: 'Purchase Requests' },
    { table: 'purchase_orders', label: 'Purchase Orders' },
    { table: 'goods_receipts', label: 'Goods Receipts' },
    { table: 'inventory', label: 'Inventory' },
    { table: 'notifications', label: 'Notifications' },
  ];

  for (const { table, label } of checks) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${label}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ ${label}: ${count || 0} rows`);
    }
  }
}

checkData().catch(console.error);
