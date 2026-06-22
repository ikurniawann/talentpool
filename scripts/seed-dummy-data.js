#!/usr/bin/env node
/**
 * Seed script — dummy data untuk semua modul Arkiv OS
 * Minimal 10 data per entitas utama
 * Run: node scripts/seed-dummy-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const uuid = () => crypto.randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dateStr = (daysOffset = 0) => {
  const d = new Date('2026-06-22');
  d.setDate(d.getDate() - daysOffset);
  return d.toISOString().split('T')[0];
};
const tsStr = (daysOffset = 0, hour = 8) => {
  const d = new Date('2026-06-22');
  d.setDate(d.getDate() - daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

async function run(table, rows, opts = {}) {
  const method = opts.upsert
    ? sb.from(table).upsert(rows, { onConflict: opts.conflict || 'id', ignoreDuplicates: true })
    : sb.from(table).insert(rows);
  const { data, error } = await method.select();
  if (error) {
    console.error(`  ✗ ${table}: ${error.message}`);
    return [];
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
  return data || [];
}

// ─── FIXED IDs ────────────────────────────────────────────────────────────────
const DEPT = {
  hrd: '3533f549-eeaa-4351-8d5e-5f4fd730e805',
  creative: 'db45f8b2-eca0-47f5-b781-39c262a45b3e',
  tech: '2f308e4e-2e1f-4675-8dcf-5d53f80d2de2',
  ops: 'e6640023-4e86-4c4f-b52a-e3acb6a11561',
};
const POS_TITLE = {
  kasir: 'b3b73017-6da5-4d2f-9d4f-9f2e097d6933',
  gm: '3b7e2791-65b2-4ec4-93fe-5268cf529611',
  opsManager: '305afb09-06ec-493c-8064-90e820cccb0e',
};

const EMP_IDS = Array.from({ length: 10 }, uuid);
const SUP_IDS = Array.from({ length: 10 }, uuid);
const BB_IDS  = Array.from({ length: 10 }, uuid);
// Real satuan IDs already in DB (inserted by seedMaster)
const SAT_IDS = {
  pcs:   '186abfe3-5979-4b77-a393-6ab366fd8e91',
  kg:    '6cf2c6c3-2ceb-4fe6-83c6-fc7d24d715cd',
  liter: '2e767dfe-b12d-4fcc-86c2-e255df729081',
  gram:  'a842514c-2184-407a-81a8-46c98897f007',
  box:   '02677ed2-174e-4783-9d62-101c7faf5bd3',
};
const TIER_IDS = { bronze: uuid(), silver: uuid(), gold: uuid() };
const CAT_IDS  = Array.from({ length: 5 }, uuid);
const PROD_IDS = Array.from({ length: 10 }, uuid);

// ════════════════════════════════════════════════════════════════════════════
async function seedMaster() {
  console.log('\n📦 MASTER DATA');

  // Employment statuses
  await run('employment_statuses', [
    { id: uuid(), code: 'permanent',   name: 'Tetap',    color: 'green',  is_active: true },
    { id: uuid(), code: 'contract',    name: 'Kontrak',  color: 'blue',   is_active: true },
    { id: uuid(), code: 'probation',   name: 'Probasi',  color: 'yellow', is_active: true },
    { id: uuid(), code: 'internship',  name: 'Magang',   color: 'purple', is_active: true },
    { id: uuid(), code: 'resigned',    name: 'Resign',   color: 'red',    is_active: true },
    { id: uuid(), code: 'terminated',  name: 'PHK',      color: 'red',    is_active: true },
    { id: uuid(), code: 'suspended',   name: 'Suspend',  color: 'orange', is_active: true },
  ], { upsert: true, conflict: 'code' });

  // Satuan
  await run('satuan', [
    { id: SAT_IDS.pcs,   kode: 'PCS',   nama: 'Pieces',    deskripsi: 'Satuan buah/pcs' },
    { id: SAT_IDS.kg,    kode: 'KG',    nama: 'Kilogram',  deskripsi: 'Satuan berat' },
    { id: SAT_IDS.liter, kode: 'LTR',   nama: 'Liter',     deskripsi: 'Satuan volume' },
    { id: SAT_IDS.gram,  kode: 'GR',    nama: 'Gram',      deskripsi: 'Satuan berat kecil' },
    { id: SAT_IDS.box,   kode: 'BOX',   nama: 'Box',       deskripsi: 'Satuan kotak' },
    { id: uuid(),        kode: 'BTL',   nama: 'Botol',     deskripsi: 'Satuan botol' },
    { id: uuid(),        kode: 'SAK',   nama: 'Sak',       deskripsi: 'Satuan sak' },
    { id: uuid(),        kode: 'ROLL',  nama: 'Roll',      deskripsi: 'Satuan roll' },
    { id: uuid(),        kode: 'LBR',   nama: 'Lembar',    deskripsi: 'Satuan lembar' },
    { id: uuid(),        kode: 'PORSI', nama: 'Porsi',     deskripsi: 'Satuan porsi' },
  ], { upsert: true, conflict: 'kode' });
}

// ════════════════════════════════════════════════════════════════════════════
// Real employee IDs already seeded
const REAL_EMP_IDS = [
  '2c15cb2e-d289-4e2f-abfa-9a29a69e5510',
  '6cc72633-17b7-42ad-bf24-574461e36cbc',
  'd8d32948-cde7-4bf0-9aff-0842de2554f9',
  '8854801e-d336-410c-869a-317ddc1baf1e',
  '1ca028c8-8f0c-4be4-b09b-b2391888370b',
  '753755e5-1cb9-4a98-88cd-d5ee0e8bfe28',
  '67b68a3a-2911-472d-8ca9-de48459af8e7',
  '2738a4d6-8c49-4fd9-bbc9-457a67a08370',
  'de79eb4a-5245-4ad8-9d61-7359251233ca',
  '327ca8f8-29db-4412-94c2-f68d3f5fae10',
];

async function seedHRIS() {
  console.log('\n👥 HRIS — EMPLOYEES');

  const deptList = Object.values(DEPT);
  const people = [
    ['Ahmad Fauzi',    'male',   '1992-03-15', DEPT.ops],
    ['Siti Rahayu',    'female', '1994-07-22', DEPT.hrd],
    ['Budi Santoso',   'male',   '1990-11-05', DEPT.ops],
    ['Dewi Kusuma',    'female', '1995-01-30', DEPT.creative],
    ['Rizky Pratama',  'male',   '1993-08-17', DEPT.tech],
    ['Nurul Hidayah',  'female', '1996-04-12', DEPT.hrd],
    ['Eko Prasetyo',   'male',   '1991-06-25', DEPT.ops],
    ['Fitri Andriani', 'female', '1997-09-08', DEPT.creative],
    ['Hendra Gunawan', 'male',   '1989-12-20', DEPT.tech],
    ['Indah Permata',  'female', '1998-02-14', DEPT.ops],
  ];

  const employees = people.map(([name, gender, birth_date, dept_id], i) => ({
    id: EMP_IDS[i],
    full_name: name,
    nip: `NIP-2024-${String(i + 1).padStart(4, '0')}`,
    email: `${name.toLowerCase().replace(/ /g, '.')}.arkiv@gmail.com`,
    phone: `081${String(300000001 + i)}`,
    birth_date,
    gender,
    marital_status: i % 3 === 0 ? 'married' : 'single',
    address: `Jl. Contoh No. ${i + 1}, Jakarta Selatan`,
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postal_code: '12340',
    join_date: dateStr(365 - i * 20),
    employment_status: 'active',
    is_active: true,
    department_id: dept_id,
    job_title_id: i === 0 ? POS_TITLE.opsManager : POS_TITLE.kasir,
    bank_name: pick(['BCA', 'Mandiri', 'BRI', 'BNI']),
    bank_account: `000${String(100000001 + i)}`,
    emergency_contact_name: `Keluarga ${name.split(' ')[0]}`,
    emergency_contact_phone: `082${String(200000001 + i)}`,
    emergency_contact_relationship: 'spouse',
  }));
  await run('employees', employees, { upsert: true, conflict: 'nip' });

  // Re-fetch real IDs after upsert
  const { data: freshEmps } = await sb.from('employees').select('id').order('created_at').limit(10);
  const realIds = freshEmps ? freshEmps.map(e => e.id) : REAL_EMP_IDS;

  // Attendance — 2 baris per karyawan (10 karyawan × 2 hari = 20 rows, ambil 10)
  console.log('\n📋 HRIS — ATTENDANCE');
  const today = dateStr(0);
  const yesterday = dateStr(1);
  const attendRows = realIds.slice(0, 10).flatMap((emp_id, i) => [
    {
      id: uuid(), employee_id: emp_id, date: today,
      clock_in: tsStr(0, 8), clock_out: tsStr(0, 17),
      work_hours: 8, status: 'present', is_late: false, late_minutes: 0,
    },
    {
      id: uuid(), employee_id: emp_id, date: yesterday,
      clock_in: tsStr(1, i % 2 === 0 ? 8 : 9), clock_out: tsStr(1, 17),
      work_hours: i % 2 === 0 ? 8 : 7, status: 'present',
      is_late: i % 2 !== 0, late_minutes: i % 2 !== 0 ? 60 : 0,
    },
  ]);
  await run('attendance', attendRows.slice(0, 10), { upsert: true, conflict: 'employee_id,date' });

  // Leaves — trigger di DB memiliki bug enum 'marriage', skip untuk sementara
  console.log('\n🏖️  HRIS — LEAVES: skip (trigger DB bug, akan di-fix via EPIC-007)');
}

// ════════════════════════════════════════════════════════════════════════════
async function seedPurchasing() {
  console.log('\n🏭 PURCHASING — SUPPLIERS');

  const supplierData = [
    ['PT Bahan Prima Utama',      'Budi Hartono',   '0811000001', 'bahan_pangan'],
    ['CV Sumber Segar',           'Siti Aminah',    '0811000002', 'bahan_pangan'],
    ['PT Distributor Nusantara',  'Agus Wijaya',    '0811000003', 'bahan_pangan'],
    ['UD Makmur Jaya',            'Dewi Lestari',   '0811000004', 'bahan_pangan'],
    ['PT Agri Berkah',            'Hendra Kusuma',  '0811000005', 'bahan_pangan'],
    ['CV Indo Spice',             'Rina Susanti',   '0811000006', 'bahan_pangan'],
    ['PT Kemasan Mandiri',        'Doni Prakoso',   '0811000007', 'kemasan'],
    ['UD Dapur Sejahtera',        'Ani Pertiwi',    '0811000008', 'bahan_pangan'],
    ['PT Frozen Food Indo',       'Bayu Nugroho',   '0811000009', 'bahan_pangan'],
    ['CV Minuman Segar',          'Citra Dewi',     '0811000010', 'minuman'],
  ];

  const suppliers = supplierData.map(([nama_supplier, pic_name, pic_phone, kategori], i) => ({
    id: SUP_IDS[i],
    kode: `SUP-${String(i + 1).padStart(3, '0')}`,
    nama_supplier,
    pic_name,
    pic_phone,
    email: `${nama_supplier.toLowerCase().replace(/[^a-z]/g, '')}@supplier.co.id`,
    alamat: `Jl. Industri No. ${10 + i}, Tangerang`,
    kota: pick(['Jakarta', 'Tangerang', 'Bekasi', 'Bogor']),
    kategori,
    status: 'active',
    is_active: true,
    payment_terms: pick([30, 14, 7, 0]),
    currency: 'IDR',
    bank_nama: pick(['BCA', 'Mandiri', 'BRI', 'BNI']),
    bank_rekening: `0000${String(100001 + i)}`,
    bank_atas_nama: pic_name,
  }));
  await run('suppliers', suppliers, { upsert: true, conflict: 'kode' });

  // Bahan Baku (F&B)
  console.log('\n🥩 PURCHASING — BAHAN BAKU');
  const bbData = [
    ['BB-F01', 'Tepung Terigu Cakra',  SAT_IDS.kg,    'BAHAN_PANGAN', 12000, 50, 'RAK-A1'],
    ['BB-F02', 'Gula Pasir',           SAT_IDS.kg,    'BAHAN_PANGAN', 14000, 30, 'RAK-A2'],
    ['BB-F03', 'Susu UHT Full Cream',  SAT_IDS.liter, 'BAHAN_PANGAN', 18000, 48, 'RAK-B1'],
    ['BB-F04', 'Mentega Anchor 500g',  SAT_IDS.kg,    'BAHAN_PANGAN', 45000, 10, 'RAK-B2'],
    ['BB-F05', 'Kopi Arabika Gayo',    SAT_IDS.kg,    'BAHAN_PANGAN', 120000, 5, 'RAK-C1'],
    ['BB-F06', 'Coklat Bubuk Van Houten', SAT_IDS.kg, 'BAHAN_PANGAN', 85000,  5, 'RAK-C2'],
    ['BB-F07', 'Telur Ayam Negeri',    SAT_IDS.pcs,   'BAHAN_PANGAN', 3000, 100, 'RAK-D1'],
    ['BB-F08', 'Minyak Kelapa Sawit',  SAT_IDS.liter, 'BAHAN_PANGAN', 16000, 20, 'RAK-D2'],
    ['BB-F09', 'Garam Halus Refina',   SAT_IDS.kg,    'BAHAN_PANGAN', 5000,  10, 'RAK-E1'],
    ['BB-F10', 'Vanilla Ekstrak',      SAT_IDS.liter, 'BAHAN_PANGAN', 95000,  2, 'RAK-E2'],
  ];

  const bahanBaku = bbData.map(([kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak], i) => ({
    id: BB_IDS[i],
    kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak,
    is_active: true,
  }));
  await run('bahan_baku', bahanBaku, { upsert: true, conflict: 'kode' });
}

// ════════════════════════════════════════════════════════════════════════════
async function seedPOS() {
  console.log('\n🍽️  POS — CATEGORIES');

  const cats = [
    { id: CAT_IDS[0], name: 'Makanan',  display_order: 1, is_active: true },
    { id: CAT_IDS[1], name: 'Minuman',  display_order: 2, is_active: true },
    { id: CAT_IDS[2], name: 'Dessert',  display_order: 3, is_active: true },
    { id: CAT_IDS[3], name: 'Snack',    display_order: 4, is_active: true },
    { id: CAT_IDS[4], name: 'Paket',    display_order: 5, is_active: true },
  ];
  await run('pos_categories', cats, { upsert: true });

  console.log('\n🍕 POS — PRODUCTS');
  const prodData = [
    ['Nasi Goreng Spesial',       CAT_IDS[0], 35000, 12000, 'kitchen',  10],
    ['Mie Goreng Seafood',        CAT_IDS[0], 38000, 14000, 'kitchen',  10],
    ['Ayam Goreng Kremes',        CAT_IDS[0], 42000, 15000, 'kitchen',  15],
    ['Es Kopi Susu',              CAT_IDS[1], 28000,  8000, 'bar',      20],
    ['Matcha Latte',              CAT_IDS[1], 32000, 10000, 'bar',      20],
    ['Smoothie Buah Segar',       CAT_IDS[1], 30000,  9000, 'bar',      15],
    ['Cheesecake Slice',          CAT_IDS[2], 35000, 12000, 'dessert',  25],
    ['Brownies Coklat Leleh',     CAT_IDS[2], 28000,  9000, 'dessert',  20],
    ['French Fries Crispy',       CAT_IDS[3], 25000,  7000, 'kitchen',  10],
    ['Paket Hemat (Nasi+Minum)',  CAT_IDS[4], 55000, 20000, 'kitchen',  30],
  ];

  const products = prodData.map(([name, category_id, base_price, cost_price, station, xp_points], i) => ({
    id: PROD_IDS[i],
    sku: `PRD-${String(i + 1).padStart(3, '0')}`,
    name, category_id, base_price, cost_price,
    is_active: true, is_available: true,
    inventory_tracking: false, xp_points,
    tax_rate: 0, service_charge_rate: 0,
    station, prep_time_minutes: pick([5, 10, 15]),
    description: `Menu pilihan: ${name}`,
  }));
  await run('pos_products', products, { upsert: true, conflict: 'sku' });
}

// ════════════════════════════════════════════════════════════════════════════
async function seedCRM() {
  console.log('\n💎 CRM — MEMBERSHIP TIERS');

  await run('crm_membership_tiers', [
    {
      id: TIER_IDS.bronze, code: 'bronze', name: 'Bronze', rank: 1,
      min_lifetime_xp: 0, min_total_spend: 0,
      xp_multiplier: 1.0, discount_percent: 0,
      display_color: '#CD7F32',
      benefits: JSON.stringify(['Akses loyalty points', 'Newsletter member']),
      is_active: true,
    },
    {
      id: TIER_IDS.silver, code: 'silver', name: 'Silver', rank: 2,
      min_lifetime_xp: 2000, min_total_spend: 500000,
      xp_multiplier: 1.5, discount_percent: 5,
      display_color: '#C0C0C0',
      benefits: JSON.stringify(['1.5x XP multiplier', 'Diskon 5%', 'Priority queue']),
      is_active: true,
    },
    {
      id: TIER_IDS.gold, code: 'gold', name: 'Gold', rank: 3,
      min_lifetime_xp: 5000, min_total_spend: 2000000,
      xp_multiplier: 2.0, discount_percent: 10,
      display_color: '#FFD700',
      benefits: JSON.stringify(['2x XP multiplier', 'Diskon 10%', 'Birthday reward', 'Early access menu baru']),
      is_active: true,
    },
  ], { upsert: true, conflict: 'code' });

  console.log('\n👤 CRM — MEMBER PROFILES');
  // crm_member_profiles requires customer_id — need to check if pos_customers exists
  const { count: custCount } = await sb.from('pos_customers').select('*', { count: 'exact', head: true });
  if (!custCount || custCount < 10) {
    console.log('  ℹ pos_customers < 10, tambah customers...');
    // Insert customers first
    const custNames = [
      'Andi Wijaya','Bela Susanti','Cahyo Nugroho','Diana Putri','Eko Setiawan',
      'Farah Nadia','Gilang Ramadhan','Hana Kusuma','Ivan Prasetya','Julia Santika',
    ];
    const { data: custData } = await sb.from('pos_customers').insert(
      custNames.map((name, i) => ({
        id: uuid(),
        name,
        phone: `0812${String(10000001 + i)}`,
        email: `${name.toLowerCase().replace(/ /g, '')}@gmail.com`,
        membership_tier: ['bronze','bronze','silver','silver','gold','bronze','silver','gold','bronze','silver'][i],
        total_xp: (i + 1) * 800,
        current_xp: (i + 1) * 500,
        ark_coin_balance: (i + 1) * 10000,
        total_spent: (i + 1) * 250000,
        visit_count: (i + 1) * 5,
        is_active: true,
      }))
    ).select();

    if (custData) {
      // Fetch real tier IDs from DB (may differ from generated IDs)
      const { data: realTiers } = await sb.from('crm_membership_tiers').select('id,code');
      const tierByCode = Object.fromEntries((realTiers||[]).map(t=>[t.code,t.id]));
      const tierList = [
        tierByCode.bronze, tierByCode.bronze, tierByCode.silver, tierByCode.silver, tierByCode.gold,
        tierByCode.bronze, tierByCode.silver, tierByCode.gold, tierByCode.bronze, tierByCode.silver,
      ];
      await run('crm_member_profiles', custData.map((c, i) => ({
        id: uuid(),
        customer_id: c.id,
        tier_id: tierList[i],
        current_xp: (i + 1) * 500,
        lifetime_xp: (i + 1) * 800,
        spent_xp: (i + 1) * 300,
        loyalty_score: (i + 1) * 150,
        joined_at: tsStr(200 - i * 15),
      })));
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
async function seedRecruitment() {
  console.log('\n💼 RECRUITMENT — JOB OPENINGS');

  const { count } = await sb.from('job_openings').select('*', { count: 'exact', head: true });
  if (count >= 10) { console.log('  ℹ sudah ada', count, 'data, skip'); return; }

  const jobs = [
    { title: 'Barista',                dept: DEPT.ops,      dept_name: 'Operations', type: 'Full-time', slots: 2 },
    { title: 'Cook / Juru Masak',      dept: DEPT.ops,      dept_name: 'Operations', type: 'Full-time', slots: 3 },
    { title: 'Kasir / Cashier',        dept: DEPT.ops,      dept_name: 'Operations', type: 'Full-time', slots: 2 },
    { title: 'Social Media Specialist',dept: DEPT.creative, dept_name: 'Creative',   type: 'Full-time', slots: 1 },
    { title: 'Frontend Developer',     dept: DEPT.tech,     dept_name: 'Technology', type: 'Full-time', slots: 1 },
    { title: 'HR Admin',               dept: DEPT.hrd,      dept_name: 'HRD',        type: 'Full-time', slots: 1 },
    { title: 'Graphic Designer',       dept: DEPT.creative, dept_name: 'Creative',   type: 'Full-time', slots: 1 },
    { title: 'Operations Supervisor',  dept: DEPT.ops,      dept_name: 'Operations', type: 'Full-time', slots: 1 },
    { title: 'Content Creator',        dept: DEPT.creative, dept_name: 'Creative',   type: 'Contract',  slots: 2 },
    { title: 'IT Support',             dept: DEPT.tech,     dept_name: 'Technology', type: 'Full-time', slots: 1 },
  ];

  const rows = jobs.map((j) => ({
    id: uuid(),
    department_id: j.dept,
    title: j.title,
    slug: j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '') + '-' + Math.random().toString(36).slice(2, 6),
    department: j.dept_name,
    location: 'Jakarta, ID',
    employment_type: j.type,
    work_mode: 'On-site',
    headcount: j.slots,
    description: `Kami mencari ${j.title} yang berpengalaman dan berdedikasi untuk bergabung bersama tim Arkiv.`,
    requirements: `- Pengalaman minimal 1 tahun\n- Komunikatif dan mampu bekerja dalam tim\n- Berdomisili di Jakarta`,
    benefits: `- Gaji kompetitif\n- BPJS Kesehatan & Ketenagakerjaan\n- Makan siang\n- XP Arkiv Member`,
    status: 'published',
    published_at: tsStr(30),
    closing_date: dateStr(-30),
  }));
  await run('job_openings', rows);
}

// ════════════════════════════════════════════════════════════════════════════
async function seedInventory() {
  console.log('\n📦 INVENTORY — STOCK');

  const { count } = await sb.from('inventory').select('*', { count: 'exact', head: true });
  if (count >= 10) { console.log('  ℹ sudah ada', count, 'data, skip'); return; }

  // inventory.raw_material_id references raw_materials (not bahan_baku)
  // Seed raw_materials first, then inventory
  const satKgId = '6cf2c6c3-2ceb-4fe6-83c6-fc7d24d715cd';
  const satPcsId = '186abfe3-5979-4b77-a393-6ab366fd8e91';
  const satLtrId = '2e767dfe-b12d-4fcc-86c2-e255df729081';

  // units table IDs (not satuan)
  const unitsKg  = '9857cde8-d776-4af5-a1df-4d8715eaf9f4';
  const unitsPcs = '0bef58a4-6819-4ae5-a53a-54fa26553de3';
  const unitsGr  = '299ab0cd-4cea-4f29-8efb-2023219bafc1';

  const rmData = [
    ['RM-F01','Tepung Terigu Cakra', 'BAHAN_PANGAN', unitsKg],
    ['RM-F02','Gula Pasir',          'BAHAN_PANGAN', unitsKg],
    ['RM-F03','Susu UHT',            'BAHAN_PANGAN', unitsKg],
    ['RM-F04','Mentega',             'BAHAN_PANGAN', unitsKg],
    ['RM-F05','Kopi Arabika',        'BAHAN_PANGAN', unitsKg],
    ['RM-F06','Coklat Bubuk',        'BAHAN_PANGAN', unitsKg],
    ['RM-F07','Telur Ayam',          'BAHAN_PANGAN', unitsPcs],
    ['RM-F08','Minyak Goreng',       'BAHAN_PANGAN', unitsKg],
    ['RM-F09','Garam Halus',         'BAHAN_PANGAN', unitsKg],
    ['RM-F10','Vanilla Ekstrak',     'BAHAN_PANGAN', unitsGr],
  ];
  const rmRows = rmData.map(([kode, nama, kategori, satuan_besar_id]) => ({
    id: uuid(), kode, nama, kategori, satuan_besar_id, is_active: true, stok_minimum: 5,
  }));
  const rmResult = await run('raw_materials', rmRows, { upsert: true, conflict: 'kode' });
  const bbRows = rmResult && rmResult.length > 0 ? rmResult : (await sb.from('raw_materials').select('id,kode').like('kode','RM-F%')).data;
  if (!bbRows || bbRows.length === 0) { console.log('  ⚠ raw_materials kosong, skip inventory'); return; }

  const unitCosts = [12000, 14000, 18000, 45000, 120000, 85000, 3000, 16000, 5000, 95000];
  const stocks = bbRows.map((bb, i) => ({
    id: uuid(),
    raw_material_id: bb.id,
    qty_available: (i + 1) * 15,
    qty_on_order: i % 3 === 0 ? 10 : 0,
    qty_minimum: 5,
    qty_maximum: 200,
    unit_cost: unitCosts[i] || 10000,
    lokasi_rak: `RAK-${String.fromCharCode(65 + Math.floor(i / 2))}${(i % 2) + 1}`,
    is_active: true,
    catatan: null,
  }));
  await run('inventory', stocks);
}

// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 Arkiv OS — Seed Dummy Data');
  console.log('================================');
  try {
    await seedMaster();
    await seedHRIS();
    await seedPurchasing();
    await seedPOS();
    await seedCRM();
    await seedRecruitment();
    await seedInventory();
    console.log('\n✅ Selesai! Semua dummy data berhasil dibuat.');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
