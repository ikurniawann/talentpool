# POS Print Queue Worker

Print Queue sekarang punya dua mode awal:

- Browser Print: kasir membuka preview ticket dari halaman Print Queue lalu mencetak via dialog browser.
- Local Worker: mesin kasir/printer menjalankan script worker untuk menarik job pending dan mengirim ke adapter printer lokal.

## Environment

Tambahkan token yang sama di server Next.js dan mesin worker:

```bash
POS_PRINT_WORKER_TOKEN=isi-token-internal-yang-panjang
```

Worker membaca konfigurasi ini:

```bash
PRINT_QUEUE_BASE_URL=http://localhost:3000
PRINT_QUEUE_STATION=kitchen
PRINT_QUEUE_INTERVAL_MS=3000
POS_PRINT_WORKER_TOKEN=isi-token-internal-yang-panjang
```

## Run

Test format ticket:

```bash
node scripts/pos-print-worker.mjs --sample
```

Ambil job pending sekali jalan:

```bash
node scripts/pos-print-worker.mjs --once
```

Dry run tanpa mengirim ke printer fisik:

```bash
node scripts/pos-print-worker.mjs --once --dry-run
```

Mode polling:

```bash
node scripts/pos-print-worker.mjs
```

## Adapter Printer Fisik

Untuk integrasi printer thermal sungguhan, pasang adapter di bagian script yang saat ini bertuliskan mock adapter. Target adapter yang paling masuk akal:

- ESC/POS USB untuk printer thermal lokal.
- TCP port 9100 untuk network printer.
- Command vendor jika printer memakai software bridge bawaan.

Setelah adapter berhasil mencetak, worker otomatis menandai job sebagai `printed`. Jika adapter error, worker menandai job sebagai `failed` supaya bisa diretry dari UI.
