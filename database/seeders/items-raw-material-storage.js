#!/usr/bin/env node
/**
 * Seeder: item.storage_conditions — kondisi penyimpanan bahan baku restoran / F&B.
 *
 * Idempotent (upsert by code).
 *
 * Usage:
 *   node database/seeders/items-raw-material-storage.js
 *   npm run db:seed:items-raw-material-storage
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { sslForUrl, assertLocalTarget } = require("../scripts/pg-utils");

const ROOT = path.join(__dirname, "..", "..");

function loadEnv() {
  const shellKeys = new Set(Object.keys(process.env));
  for (const name of [".env", ".env.local"]) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!shellKeys.has(k)) process.env[k] = v;
    }
  }
}

/**
 * Kondisi penyimpanan standar restoran.
 * Code SUHU_RUANG / DINGIN / BEKU / KHUSUS selaras dengan enum item.raw_materials.storage_condition.
 */
const STORAGE_CONDITIONS = [
  {
    code: "SUHU_RUANG",
    nama: "Suhu Ruang",
    deskripsi: "Gudang kering suhu ruang — tepung, bumbu kering, kemasan, minyak",
  },
  {
    code: "DINGIN",
    nama: "Dingin (Chiller)",
    deskripsi: "Chiller 2°C–8°C — sayuran, dairy, protein olahan, bahan siap masak",
  },
  {
    code: "BEKU",
    nama: "Beku (Freezer)",
    deskripsi: "Freezer -18°C atau lebih dingin — daging beku, seafood beku, pastry beku",
  },
  {
    code: "KHUSUS",
    nama: "Penyimpanan Khusus",
    deskripsi: "Ruang terkontrol — wine cellar, dry aging, bahan sensitif suhu/kelembaban",
  },
  {
    code: "DRY",
    nama: "Ruang Kering",
    deskripsi: "Area gudang kering kelembaban rendah — beras, tepung, bahan kering curah",
  },
  {
    code: "CHEM",
    nama: "Bahan Kimia",
    deskripsi: "Penyimpanan terpisah untuk chemical cleaning dan hygiene non-pangan",
  },
  {
    code: "AMBIENT",
    nama: "Ambient Terkontrol",
    deskripsi: "Suhu ruang dengan sirkulasi udara — bahan semi-kering dan kemasan rapuh",
  },
  {
    code: "DISPLAY",
    nama: "Display / Line",
    deskripsi: "Penyimpanan sementara di line dapur atau display station sebelum diproses",
  },
];

// Seed sebagai template global (company_id NULL) — berlaku untuk semua company.
async function upsertStorage(c, { code, nama, deskripsi }) {
  await c.query(
    `INSERT INTO item.storage_conditions (code, nama, deskripsi, company_id, is_active)
     VALUES ($1, $2, $3, NULL, true)
     ON CONFLICT (code) WHERE company_id IS NULL AND deleted_at IS NULL DO UPDATE
       SET nama = EXCLUDED.nama,
           deskripsi = EXCLUDED.deskripsi,
           is_active = true,
           deleted_at = NULL,
           updated_at = NOW()`,
    [code, nama, deskripsi]
  );
}

async function main() {
  loadEnv();
  const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: Set MIGRATE_DATABASE_URL / DATABASE_URL di .env / .env.local");
    process.exit(1);
  }
  try {
    assertLocalTarget(url, "MIGRATE_DATABASE_URL");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const c = new Client({ connectionString: url, ssl: sslForUrl(url) });
  await c.connect();

  try {
    await c.query("BEGIN");

    console.log("Seeding item.storage_conditions (restoran)...");
    for (const row of STORAGE_CONDITIONS) {
      await upsertStorage(c, row);
      console.log(`  ✓ ${row.code} — ${row.nama}`);
    }

    await c.query("COMMIT");
    console.log(`\nStorage conditions selesai: ${STORAGE_CONDITIONS.length} kondisi`);
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    console.error("Gagal:", err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
