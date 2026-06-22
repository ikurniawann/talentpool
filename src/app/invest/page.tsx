import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Database,
  LineChart,
  Megaphone,
  PackageCheck,
  PieChart,
  ShieldCheck,
  Users,
} from "lucide-react";

type ModuleItem = {
  name: string;
  scope: string;
  features: string[];
  complexity: "Medium" | "High" | "Very High";
};

type BuildCostItem = {
  role: string;
  qty: number;
  months: number;
  monthlyRate: number;
  notes: string;
};

type OpexItem = {
  category: string;
  qty: string;
  unitCost: number;
  monthly: number;
  notes: string;
};

type Competitor = {
  category: string;
  names: string;
  marketPosition: string;
  arkivAngle: string;
};

const modules: ModuleItem[] = [
  {
    name: "POS F&B",
    scope: "Kasir restoran, dine-in, open bill, table ordering, KDS, printer queue",
    features: ["Cashier", "Split bill", "Void", "Shift close", "QR table order", "Kitchen display"],
    complexity: "High",
  },
  {
    name: "CRM & Loyalty",
    scope: "Member database, XP, reward, avatar inventory, customer segmentation",
    features: ["Member profile", "Rewards", "Tiers", "XP rules", "Redemption", "Avatar collection"],
    complexity: "Medium",
  },
  {
    name: "Purchasing",
    scope: "Supplier, PR, PO, price list, approval, delivery, receiving, vendor payment",
    features: ["Supplier master", "Purchase request", "Purchase order", "GRN", "QC", "Supplier performance"],
    complexity: "Very High",
  },
  {
    name: "Inventory",
    scope: "Stok bahan baku, produk, movement, low stock, adjustment, transfer",
    features: ["Stock card", "Movement history", "Low stock", "Adjustment", "Transfer", "Valuation"],
    complexity: "High",
  },
  {
    name: "Production",
    scope: "Recipe/BOM, WIP, material shortage, production order, COGS/HPP",
    features: ["BOM", "WIP", "Shortage check", "Production order", "Actual usage", "HPP breakdown"],
    complexity: "Very High",
  },
  {
    name: "HRIS",
    scope: "Recruitment, employee, attendance, leave, payroll, KPI, performance",
    features: ["Candidate pipeline", "Employee master", "Attendance", "Leave", "Payroll", "Performance review"],
    complexity: "Very High",
  },
  {
    name: "Finance & Accounting",
    scope: "Reporting, purchasing cost, POS revenue, margin, journal-ready summary",
    features: ["Revenue report", "Profit report", "COGS", "Payable", "Cash movement", "Export"],
    complexity: "High",
  },
  {
    name: "Analytics & AI Assistant",
    scope: "Dashboard, operational insight, assistant workflow, activity log",
    features: ["Overview dashboard", "Sales trend", "Stock alert", "AI assistant", "Activity log", "Recommendations"],
    complexity: "Medium",
  },
];

const buildCost: BuildCostItem[] = [
  { role: "Product Manager / Business Analyst", qty: 1, months: 9, monthlyRate: 30000000, notes: "Scope, roadmap, specs, UAT, stakeholder alignment" },
  { role: "Tech Lead / Solution Architect", qty: 1, months: 10, monthlyRate: 45000000, notes: "Architecture, review, security, deployment strategy" },
  { role: "Senior Full-stack Engineer", qty: 2, months: 10, monthlyRate: 38000000, notes: "Core modules, API, data model, integration" },
  { role: "Frontend Engineer", qty: 2, months: 9, monthlyRate: 28000000, notes: "Dashboard, POS, HRIS, responsive public surfaces" },
  { role: "Backend Engineer", qty: 1, months: 10, monthlyRate: 35000000, notes: "Database, API, auth, background workflow" },
  { role: "QA Engineer", qty: 1, months: 8, monthlyRate: 22000000, notes: "Regression, test case, release gate, device/printer QA" },
  { role: "UI/UX Product Designer", qty: 1, months: 6, monthlyRate: 25000000, notes: "Design system, workflow design, usability" },
  { role: "DevOps / Cloud Engineer", qty: 0.5, months: 8, monthlyRate: 30000000, notes: "CI/CD, observability, backup, cost control" },
];

const opex: OpexItem[] = [
  { category: "Cloud app hosting", qty: "2 production apps + preview", unitCost: 2500000, monthly: 2500000, notes: "Vercel/VM baseline, autoscale buffer" },
  { category: "Managed database", qty: "1 primary + backup", unitCost: 3500000, monthly: 3500000, notes: "Postgres/Supabase tier, backup, PITR target" },
  { category: "Object storage", qty: "500 GB", unitCost: 2500, monthly: 1250000, notes: "CV, payslip, product image, receipt/archive files" },
  { category: "Email transactional", qty: "100k email/month", unitCost: 700000, monthly: 700000, notes: "Verification, notification, payroll/payslip" },
  { category: "WhatsApp/SMS notification", qty: "30k message/month", unitCost: 350, monthly: 10500000, notes: "OTP, order update, HR notification, reminder" },
  { category: "Monitoring & logging", qty: "1 workspace", unitCost: 2000000, monthly: 2000000, notes: "Error tracking, logs, uptime alert" },
  { category: "AI/API usage", qty: "20k assistant actions/month", unitCost: 150, monthly: 3000000, notes: "Internal assistant, summarization, report drafting" },
  { category: "Support operations", qty: "2 support staff", unitCost: 8000000, monthly: 16000000, notes: "Ticket handling, onboarding, implementation support" },
  { category: "Security & compliance", qty: "Monthly reserve", unitCost: 3000000, monthly: 3000000, notes: "Audit, vulnerability scan, policy work" },
];

const competitors: Competitor[] = [
  {
    category: "HRIS",
    names: "Mekari Talenta, Gadjian, KaryaONE, GreatDay HR",
    marketPosition: "Strong in payroll, attendance, employee administration",
    arkivAngle: "Position as integrated HRIS plus F&B operations, not HR-only",
  },
  {
    category: "POS F&B",
    names: "Moka, ESB, Olsera, Pawoon, Majoo",
    marketPosition: "Strong in outlet cashier, QR ordering, payment, merchant tools",
    arkivAngle: "Win with deeper production, purchasing, inventory, HRIS, and margin control",
  },
  {
    category: "Accounting/ERP",
    names: "Accurate Online, Jurnal Mekari, Odoo",
    marketPosition: "Strong in accounting, invoicing, broad ERP customization",
    arkivAngle: "Win with vertical workflow for F&B chains and service businesses",
  },
  {
    category: "Custom Software House",
    names: "Local vendors and freelancers",
    marketPosition: "Flexible but quality, maintenance, and roadmap are inconsistent",
    arkivAngle: "Productized implementation with reusable modules and predictable support",
  },
];

const pricingRows = [
  {
    package: "Starter Subscription",
    target: "1 outlet / early operator",
    price: "Rp250rb/bulan",
    includes: "POS basic, CRM basic, product catalog, daily sales report",
  },
  {
    package: "Growth Subscription",
    target: "2-5 outlet / growing operator",
    price: "Rp750rb-1,5jt/bulan",
    includes: "POS multi outlet, table order, inventory basic, CRM loyalty, reporting",
  },
  {
    package: "Business Subscription",
    target: "6-20 outlet / operational team",
    price: "Rp2jt-3,5jt/bulan",
    includes: "Purchasing, inventory, HRIS, approval, analytics, support priority",
  },
  {
    package: "Enterprise Subscription",
    target: "20+ outlet / multi brand",
    price: "Rp5jt/bulan",
    includes: "Full suite, custom workflow, SLA, onboarding, private support",
  },
  {
    package: "Jual Putus License",
    target: "Company requiring ownership",
    price: "Rp150jt-500jt sekali bayar",
    includes: "Deployment, configuration, 3-month warranty, paid maintenance optional",
  },
];

const forecast = [
  { year: "Y1", clients: 30, arr: 144000000, services: 300000000, opex: 720000000, ebitda: -276000000 },
  { year: "Y2", clients: 120, arr: 1008000000, services: 600000000, opex: 1500000000, ebitda: 108000000 },
  { year: "Y3", clients: 320, arr: 4608000000, services: 1200000000, opex: 3000000000, ebitda: 2808000000 },
  { year: "Y4", clients: 700, arr: 15120000000, services: 2000000000, opex: 5600000000, ebitda: 11520000000 },
  { year: "Y5", clients: 1300, arr: 39000000000, services: 3000000000, opex: 9800000000, ebitda: 32200000000 },
];

const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const compactIdr = (value: number) => {
  if (value >= 1000000000) return `Rp${(value / 1000000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}Miliar`;
  return `Rp${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}Jt`;
};

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{children}</span>;
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  inverse = false,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div className="mb-6 flex max-w-4xl gap-4">
      <div className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg ${inverse ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className={`text-2xl font-semibold tracking-normal md:text-3xl ${inverse ? "text-white" : "text-slate-950"}`}>{title}</h2>
        <p className={`mt-2 text-sm leading-6 md:text-base ${inverse ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
      </div>
    </div>
  );
}

export default function InvestPage() {
  const totalBuildCost = buildCost.reduce((sum, item) => sum + item.qty * item.months * item.monthlyRate, 0);
  const contingency = totalBuildCost * 0.18;
  const totalOpex = opex.reduce((sum, item) => sum + item.monthly, 0);
  const maxArr = Math.max(...forecast.map((item) => item.arr));

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:44px_44px]">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/arkiv-os" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <Image src="/logos/logo.png" alt="Arkiv OS" width={28} height={28} className="h-7 w-auto object-contain" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-950">Arkivworld</span>
                <span className="block text-xs font-medium text-slate-500">Investment page</span>
              </span>
            </Link>
            <div className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
              <a href="#modules">Modules</a>
              <a href="#cost">Cost</a>
              <a href="#market">Market</a>
              <a href="#forecast">Forecast</a>
            </div>
          </nav>

          <div className="grid gap-8 py-12 lg:grid-cols-[1fr_420px] lg:py-16">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 md:text-6xl">
                Arkiv OS Investment Brief
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                Halaman publik untuk memetakan nilai bisnis Arkiv OS: daftar modul, estimasi biaya pembangunan, OPEX,
                strategi pasar Indonesia, pricing, dan proyeksi finansial. Angka di bawah adalah asumsi perencanaan
                internal yang perlu divalidasi lagi sebelum fundraising atau sales proposal final.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#forecast"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Lihat proyeksi
                  <ArrowRight className="size-4" />
                </a>
                <a
                  href="#pricing"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Strategi pricing
                </a>
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <PieChart className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">Executive Snapshot</h2>
                  <p className="text-sm text-slate-500">Build once, sell vertical SaaS repeatedly</p>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  ["Module coverage", `${modules.length} core modules`],
                  ["Estimated build", compactIdr(totalBuildCost + contingency)],
                  ["Baseline OPEX", `${compactIdr(totalOpex)}/month`],
                  ["Y5 ARR scenario", compactIdr(forecast[4].arr)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-right text-sm font-bold text-slate-950">{value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <SectionTitle
          icon={PackageCheck}
          title="1. Module List & Feature Breakdown"
          description="Arkiv OS diposisikan sebagai operating system untuk bisnis F&B, retail-service, dan multi-outlet: bukan sekadar POS atau HRIS, tetapi rangkaian modul operasional yang saling terhubung."
        />
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Feature Breakdown</th>
                  <th className="px-4 py-3 font-semibold">Complexity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {modules.map((module) => (
                  <tr key={module.name} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-950">{module.name}</td>
                    <td className="max-w-md px-4 py-4 leading-6 text-slate-600">{module.scope}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {module.features.map((feature) => (
                          <Badge key={feature}>{feature}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{module.complexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="cost" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[1fr_360px]">
          <div>
            <SectionTitle
              icon={Calculator}
              title="2. Build Cost & Manpower"
              description="Estimasi untuk membangun versi production-grade selama 9-10 bulan, termasuk stabilisasi lint/typecheck, QA, dokumentasi, deployment, security, dan UAT multi-role."
            />
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Months</th>
                      <th className="px-4 py-3">Rate/month</th>
                      <th className="px-4 py-3">Subtotal</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buildCost.map((item) => (
                      <tr key={item.role} className="align-top">
                        <td className="px-4 py-3 font-semibold text-slate-950">{item.role}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{item.months}</td>
                        <td className="px-4 py-3">{formatIdr(item.monthlyRate)}</td>
                        <td className="px-4 py-3 font-semibold">{formatIdr(item.qty * item.months * item.monthlyRate)}</td>
                        <td className="px-4 py-3 leading-6 text-slate-600">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <BriefcaseBusiness className="mb-4 size-8 text-emerald-700" />
            <h3 className="text-xl font-semibold">Investment to MVP+</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Direct manpower</span>
                <span className="font-bold">{formatIdr(totalBuildCost)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Contingency 18%</span>
                <span className="font-bold">{formatIdr(contingency)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between gap-4 text-base">
                  <span className="font-semibold">Total estimate</span>
                  <span className="font-bold text-emerald-700">{formatIdr(totalBuildCost + contingency)}</span>
                </div>
              </div>
              <p className="pt-3 leading-6 text-slate-600">
                Range realistis untuk production launch: Rp2,8M-3,8M tergantung kedalaman finance, printer/payment integration,
                compliance payroll, dan data migration.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <SectionTitle
            icon={Database}
            title="3. OPEX Operasional"
            description="OPEX awal dihitung untuk SaaS kecil-menengah dengan 10-30 klien aktif, termasuk cloud, database, messaging, AI, monitoring, dan support."
          />
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase text-white">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Unit Cost</th>
                      <th className="px-4 py-3">Monthly</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {opex.map((item) => (
                      <tr key={item.category} className="align-top">
                        <td className="px-4 py-3 font-semibold">{item.category}</td>
                        <td className="px-4 py-3 text-slate-600">{item.qty}</td>
                        <td className="px-4 py-3">{formatIdr(item.unitCost)}</td>
                        <td className="px-4 py-3 font-semibold">{formatIdr(item.monthly)}</td>
                        <td className="px-4 py-3 leading-6 text-slate-600">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          <aside className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
            <CircleDollarSign className="mb-4 size-9 text-emerald-300" />
            <h3 className="text-xl font-semibold">Baseline Monthly Burn</h3>
            <p className="mt-3 text-4xl font-semibold">{compactIdr(totalOpex)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Belum termasuk kantor fisik, legal retainer besar, enterprise implementation travel, dan sales commission.
            </p>
          </aside>
        </div>
      </section>

      <section id="market" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <SectionTitle
            icon={Megaphone}
            title="4. Marketing Strategy Indonesia"
            description="Masuk pasar lewat vertical wedge: F&B multi-outlet, coffee shop chain, cloud kitchen, retail-service, dan bisnis jasa yang butuh HRIS plus operasional outlet."
          />
          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Users className="mb-4 size-8 text-emerald-700" />
              <h3 className="text-lg font-semibold">Target Demografi</h3>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <p><strong className="text-slate-950">Primary buyer:</strong> owner/operator F&B usia 28-45 tahun, sudah punya 2-20 outlet, pusing di stok, purchasing, payroll, dan margin.</p>
                <p><strong className="text-slate-950">Economic buyer:</strong> founder, finance manager, operations head, HR manager.</p>
                <p><strong className="text-slate-950">Initial geography:</strong> Jabodetabek, Bandung, Surabaya, Bali, Yogyakarta, Medan, Makassar.</p>
                <p><strong className="text-slate-950">Pain:</strong> data pecah antara POS, spreadsheet, HR, pembelian, produksi, dan accounting.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Acquisition channel", "Founder-led sales, demo ke komunitas F&B, referral accountant/consultant, LinkedIn, TikTok edukasi operasional, webinar costing."],
                ["Content angle", "Konten audit stok bocor, HPP real, payroll outlet, purchase approval, kitchen production, dan profit per menu."],
                ["Sales motion", "Free ops audit 60 menit, paid implementation workshop, 14-day pilot untuk satu outlet, expand ke seluruh outlet."],
                ["Partnership", "Accounting firm, franchise consultant, payment aggregator, printer/POS hardware vendor, HR consultant."],
              ].map(([title, body]) => (
                <article key={title} className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Competitors</th>
                  <th className="px-4 py-3">Market Position</th>
                  <th className="px-4 py-3">Arkiv Angle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitors.map((item) => (
                  <tr key={item.category} className="align-top">
                    <td className="px-4 py-4 font-semibold">{item.category}</td>
                    <td className="px-4 py-4 text-slate-700">{item.names}</td>
                    <td className="px-4 py-4 leading-6 text-slate-600">{item.marketPosition}</td>
                    <td className="px-4 py-4 leading-6 text-emerald-800">{item.arkivAngle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <SectionTitle
          icon={Building2}
          title="5. Pricing Strategy"
          description="Pricing dibuat mass-market dan kompetitif: entry rendah untuk penetrasi outlet kecil, lalu naik bertahap berdasarkan jumlah outlet, kedalaman modul, support, dan SLA."
        />
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-3 md:grid-cols-2">
            {pricingRows.map((item) => (
              <article key={item.package} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">{item.package}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.target}</p>
                <p className="mt-4 text-2xl font-semibold text-emerald-700">{item.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.includes}</p>
              </article>
            ))}
          </div>
          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <ShieldCheck className="mb-4 size-8 text-emerald-700" />
            <h3 className="font-semibold">Benchmark Note</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Benchmark publik yang bisa terlihat saat riset: Moka menampilkan paket POS sekitar Rp299k, Rp499k, sampai
              Rp799k per outlet/bulan. Dengan entry Rp250rb/bulan, Arkiv bisa masuk di bawah POS mainstream, lalu
              monetisasi naik melalui add-on operasional, HRIS, purchasing, inventory, dan analytics.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <a className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700" href="https://www.mokapos.com/harga" target="_blank" rel="noreferrer">
                Moka pricing
              </a>
              <a className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700" href="https://www.talenta.co/harga/" target="_blank" rel="noreferrer">
                Talenta pricing
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section id="forecast" className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <SectionTitle
            icon={LineChart}
            title="6. Forecasting & Projection"
            description="Skenario base-case disesuaikan dengan pricing baru Rp250rb-Rp5jt/bulan: revenue per klien lebih rendah, sehingga strategi growth harus mengejar volume pelanggan dan upsell bertahap."
            inverse
          />
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-white/10 text-xs uppercase text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Clients</th>
                    <th className="px-4 py-3">ARR</th>
                    <th className="px-4 py-3">Services</th>
                    <th className="px-4 py-3">OPEX</th>
                    <th className="px-4 py-3">Projected EBITDA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {forecast.map((item) => (
                    <tr key={item.year}>
                      <td className="px-4 py-4 font-semibold">{item.year}</td>
                      <td className="px-4 py-4">{item.clients}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-300">{formatIdr(item.arr)}</td>
                      <td className="px-4 py-4">{formatIdr(item.services)}</td>
                      <td className="px-4 py-4">{formatIdr(item.opex)}</td>
                      <td className={`px-4 py-4 font-semibold ${item.ebitda < 0 ? "text-red-300" : "text-emerald-300"}`}>
                        {formatIdr(item.ebitda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="rounded-lg border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold">ARR Growth Path</h3>
              <div className="mt-6 space-y-4">
                {forecast.map((item) => (
                  <div key={item.year}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold">{item.year}</span>
                      <span className="text-emerald-300">{compactIdr(item.arr)}</span>
                    </div>
                    <div className="h-3 rounded bg-white/10">
                      <div className="h-3 rounded bg-emerald-400" style={{ width: `${Math.max(6, (item.arr / maxArr) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
                <h4 className="font-semibold">Key Assumptions</h4>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>Average subscription grows from Rp400rb to Rp2,5jt/client/month.</li>
                  <li>Implementation fee ranges Rp5jt-50jt depending module depth.</li>
                  <li>Churn target below 10% annually after onboarding stabilizes.</li>
                  <li>Sales conversion depends heavily on founder-led demos and case studies.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-950">
            <CheckCircle2 className="size-4 text-emerald-700" />
            Notes for collaboration
          </div>
          Angka di halaman ini adalah planning estimate, bukan laporan keuangan audited. Sebelum dipakai untuk investor deck,
          validasi lagi rate manpower, target CAC, sales cycle, price sensitivity, cloud bill aktual, dan legal/compliance payroll.
        </div>
      </section>
    </main>
  );
}
