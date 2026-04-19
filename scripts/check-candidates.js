#!/usr/bin/env node

/**
 * Script untuk check data candidates di Supabase
 * Usage: node check-candidates.js
 */

const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Supabase
const supabaseUrl = 'https://jhmmhpbxiygpznhpaspy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobW1ocGJ4aXlncHpuaHBhc3B5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk3NDIwNCwiZXhwIjoyMDkxNTUwMjA0fQ.HK0RXSb9C4XjOQKmN-eoP-Wa_sjWfhtRFdc5cAAwI44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCandidates() {
  console.log('🔍 Checking candidates data...\n');

  // 1. Count total candidates
  const { count, error: countError } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting candidates:', countError.message);
    return;
  }

  console.log(`📊 Total Candidates: ${count}\n`);

  // 2. Count by status
  console.log('📋 Candidates by Status:');
  const { data: statusData, error: statusError } = await supabase
    .from('candidates')
    .select('status');

  if (statusError) {
    console.error('❌ Error:', statusError.message);
  } else {
    const statusCounts = {};
    statusData.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status.padEnd(20)} : ${count}`);
      });
  }
  console.log();

  // 3. Get 10 recent candidates
  console.log('👥 10 Candidates Terbaru:');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select(`
      id,
      full_name,
      email,
      phone,
      status,
      source,
      brands (name),
      positions (title),
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log('   Tidak ada data candidates.');
    return;
  }

  candidates.forEach((c, i) => {
    const date = new Date(c.created_at).toLocaleDateString('id-ID');
    const brand = c.brands?.name || '-';
    const position = c.positions?.title || '-';
    
    console.log(`\n${i + 1}. ${c.full_name}`);
    console.log(`   📧 ${c.email}`);
    console.log(`   📱 ${c.phone || '-'}`);
    console.log(`   🏢 ${brand} | ${position}`);
    console.log(`   🏷️  Status: ${c.status} | Sumber: ${c.source}`);
    console.log(`   📅 Dibuat: ${date}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
}

checkCandidates().catch(console.error);
