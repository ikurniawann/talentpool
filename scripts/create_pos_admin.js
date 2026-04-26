#!/usr/bin/env node

/**
 * Create POS Admin demo user
 * Run: node scripts/create_pos_admin.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const POS_ADMIN_EMAIL = 'pos.admin@aapextechnology.com';
const POS_ADMIN_PASSWORD = 'posadmin123';

async function createPosAdmin() {
  console.log('🔧 Creating POS Admin user...');
  console.log(`   Email: ${POS_ADMIN_EMAIL}`);
  console.log(`   Password: ${POS_ADMIN_PASSWORD}`);
  console.log('');

  // Check if user exists
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error checking existing users:', listError.message);
    return;
  }

  const existingUser = existingUsers.users.find(u => u.email === POS_ADMIN_EMAIL);
  
  if (existingUser) {
    console.log('⚠️  User already exists!');
    console.log(`   User ID: ${existingUser.id}`);
    console.log(`   Email: ${existingUser.email}`);
    console.log(`   Role: ${existingUser.user_metadata?.role || 'N/A'}`);
    
    // Update role if needed
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      user_metadata: { role: 'pos_admin', full_name: 'POS Admin' }
    });
    
    if (updateError) {
      console.error('❌ Error updating user role:', updateError.message);
    } else {
      console.log('✅ User role updated to pos_admin');
    }
    return;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email: POS_ADMIN_EMAIL,
    password: POS_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'pos_admin',
      full_name: 'POS Admin',
      department: 'POS',
      access_level: 'full'
    }
  });

  if (error) {
    console.error('❌ Error creating user:', error.message);
    return;
  }

  console.log('✅ POS Admin user created successfully!');
  console.log('');
  console.log('📋 User Details:');
  console.log(`   User ID: ${data.user.id}`);
  console.log(`   Email: ${data.user.email}`);
  console.log(`   Role: pos_admin`);
  console.log(`   Full Name: POS Admin`);
  console.log('');
  console.log('🔐 Login Credentials:');
  console.log(`   Email: ${POS_ADMIN_EMAIL}`);
  console.log(`   Password: ${POS_ADMIN_PASSWORD}`);
  console.log('');
  console.log('🌐 Login URL: https://talentpool-murex.vercel.app/login');
  console.log('📊 POS Dashboard: https://talentpool-murex.vercel.app/dashboard/pos');
}

createPosAdmin();
