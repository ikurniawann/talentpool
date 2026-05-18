#!/usr/bin/env node
/**
 * Arkiv OS — Automated Migration Runner
 * 
 * Usage:
 *   node scripts/apply-migrations.js          # dry-run (preview only)
 *   node scripts/apply-migrations.js --apply  # actually run
 *   node scripts/apply-migrations.js --apply --force  # include destructive migrations
 *
 * Requires env:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@...:6543/postgres
 *   (Get this from Supabase Dashboard → Database → Connection Pooling → Session mode)
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");
const DRY_RUN = !process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("⛔ DATABASE_URL not set.");
  console.error("   Get your connection string from Supabase Dashboard → Database → Connection Pooling.");
  console.error("   Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres");
  process.exit(1);
}

const DANGEROUS_KEYWORDS = [
  /^\s*truncate\s+/i,
  /^\s*delete\s+from\s+\w+\s*;?$/i, // DELETE without WHERE
];

function isDangerous(sql) {
  const lines = sql.split("\n");
  return lines.some((line) => DANGEROUS_KEYWORDS.some((rx) => rx.test(line)));
}

function log(label, msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  console.log(`[${ts}] ${label.padEnd(10)} ${msg}`);
}

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  log("CONN", "Connected to database");

  // Ensure tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum TEXT
    );
  `);

  // Fetch already applied migrations
  const { rows: appliedRows } = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  const applied = new Set(appliedRows.map((r) => r.filename));

  // Discover migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  log("INFO", `Found ${files.length} migration files`);
  log("INFO", `Already applied: ${applied.size}`);

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    log("OK", "All migrations are up to date ✨");
    await client.end();
    return;
  }

  log("INFO", `Pending: ${pending.length}`);
  console.log("");

  let successCount = 0;
  let skipCount = 0;

  for (const file of pending) {
    const filepath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filepath, "utf-8");

    // Safety gate: skip destructive migrations unless --force
    if (isDangerous(sql) && !FORCE) {
      log("⚠️ SKIP", `${file} — contains TRUNCATE/DELETE. Use --force to apply.`);
      skipCount++;
      continue;
    }

    const short = sql.length > 80 ? sql.slice(0, 77) + "…" : sql;

    if (DRY_RUN) {
      log("DRY-RUN", `${file} — would apply (${(sql.length / 1024).toFixed(1)} KB)`);
      continue;
    }

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
        [file, require("crypto").createHash("sha256").update(sql).digest("hex")]
      );
      await client.query("COMMIT");
      log("✅ APPLIED", `${file}`);
      successCount++;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      log("❌ FAILED", `${file} — ${error.message}`);
      console.error("\n" + "=".repeat(60));
      console.error("Migration failed. Database rolled back.");
      console.error("=".repeat(60) + "\n");
      await client.end();
      process.exit(1);
    }
  }

  await client.end();

  console.log("");
  if (DRY_RUN) {
    log("INFO", `Dry-run complete. ${pending.length} pending. Run with --apply to execute.`);
  } else {
    log("DONE", `${successCount} applied, ${skipCount} skipped, ${applied.size + successCount} total.`);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
