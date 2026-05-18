#!/usr/bin/env node

/**
 * Create / update Arkiv OS Super Admin user.
 *
 * Usage:
 *   SUPER_USER_EMAIL="owner@example.com" SUPER_USER_PASSWORD="StrongPassword123!" node scripts/create_super_user.js
 *
 * Requires .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_USER_EMAIL;
const password = process.env.SUPER_USER_PASSWORD;
const fullName = process.env.SUPER_USER_NAME || 'Arkiv Super User';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (!email || !password) {
  console.error('❌ Missing SUPER_USER_EMAIL or SUPER_USER_PASSWORD');
  console.error('Example: SUPER_USER_EMAIL="owner@example.com" SUPER_USER_PASSWORD="StrongPassword123!" node scripts/create_super_user.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertPublicProfile(userId) {
  const payload = {
    id: userId,
    full_name: fullName,
    role: 'super_admin',
    brand_id: null,
  };

  const { error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
}

async function main() {
  console.log('🔐 Creating/updating Arkiv OS Super Admin...');
  console.log(`   Email: ${email}`);

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        role: 'super_admin',
        full_name: fullName,
        access_level: 'all_modules',
      },
      app_metadata: {
        ...(existingUser.app_metadata || {}),
        role: 'super_admin',
      },
    });

    if (error) throw error;
    await upsertPublicProfile(existingUser.id);
    console.log('✅ Existing user updated as super_admin');
    console.log(`   User ID: ${data.user.id}`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'super_admin',
      full_name: fullName,
      access_level: 'all_modules',
    },
    app_metadata: {
      role: 'super_admin',
    },
  });

  if (error) throw error;
  await upsertPublicProfile(data.user.id);

  console.log('✅ Super Admin user created');
  console.log(`   User ID: ${data.user.id}`);
  console.log('   Role: super_admin');
  console.log('   Access: all modules + future AI Assistant');
}

main().catch((error) => {
  console.error('❌ Failed:', error.message || error);
  process.exit(1);
});
