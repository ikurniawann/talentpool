#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jhmmhpbxiygpznhpaspy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44'
);

const tables = [
  'satuan', 'suppliers', 'bahan_baku', 'produk',
  'departments', 'vendors', 'purchase_requests', 'pr_items',
  'purchase_orders', 'po_items', 'goods_receipts', 'gr_items',
  'quality_controls', 'returns', 'inventory', 'inventory_movements',
  'cogs_additional_costs', 'notifications'
];

async function checkTables() {
  console.log('Checking purchasing tables in Supabase...\n');
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
    if (error && error.code === '42P01') {
      console.log('❌ NOT EXISTS: ' + table);
    } else if (error) {
      console.log('⚠️  ERROR (' + error.code + '): ' + table + ' - ' + error.message);
    } else {
      console.log('✅ EXISTS: ' + table);
    }
  }
}

checkTables().catch(console.error);
