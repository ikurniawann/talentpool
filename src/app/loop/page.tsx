import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  GitBranch,
  Layers3,
  Rocket,
  ShieldCheck,
  TestTube2,
  Wrench,
  XCircle,
} from "lucide-react";

type Status = "Fixed" | "Passing" | "Failing" | "Needs Loop";
type Priority = "High" | "Medium";

type Metric = {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  tone: string;
};

type ModuleStatus = {
  module: string;
  status: Status;
  summary: string;
  blockers: string[];
};

type Verification = {
  command: string;
  status: "Passed" | "Failed" | "Stopped";
  result: string;
};

type LoopItem = {
  title: string;
  priority: Priority;
  tasks: string[];
};

const metrics: Metric[] = [
  {
    label: "Tests",
    value: "39/39",
    helper: "Vitest passed",
    icon: TestTube2,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Lint Debt",
    value: "521",
    helper: "errors remaining",
    icon: AlertTriangle,
    tone: "bg-amber-100 text-amber-700",
  },
  {
    label: "Typecheck",
    value: "Open",
    helper: "route + UI blockers remain",
    icon: Code2,
    tone: "bg-sky-100 text-sky-700",
  },
  {
    label: "Fixes Shipped",
    value: "7 files",
    helper: "pushed to GitHub",
    icon: GitBranch,
    tone: "bg-pink-100 text-pink-700",
  },
];

const moduleStatus: ModuleStatus[] = [
  {
    module: "Deployment / Supabase",
    status: "Fixed",
    summary: "Supabase browser and server helpers are now safer during prerender when Vercel preview env is incomplete.",
    blockers: ["Runtime still needs real Supabase env variables in Vercel."],
  },
  {
    module: "POS",
    status: "Fixed",
    summary: "POS void and shift close API routes were adjusted for Next.js 16 dynamic params.",
    blockers: ["POS orders page still has type issues around Base UI trigger and implicit any."],
  },
  {
    module: "Purchasing / Production",
    status: "Needs Loop",
    summary: "Several API type blockers were fixed: dashboard numeric trend, delivery PO guard, GRN unit cost typing.",
    blockers: ["Purchasing pages still fail typecheck in approval, delivery, GRN, product BOM, QC, and inventory valuation."],
  },
  {
    module: "Arkiv OS Desktop",
    status: "Needs Loop",
    summary: "Desktop module is feature-rich but has stale discriminated-union branches in typecheck.",
    blockers: ["Voice assistant needs Web Speech API type declarations."],
  },
  {
    module: "HRIS / Performance",
    status: "Needs Loop",
    summary: "Existing tests pass, but HRIS still has shared UI export and API typing debt.",
    blockers: ["CardDescription export, leave form typing, and performance chart percent typing need cleanup."],
  },
  {
    module: "CRM / Loyalty / XP",
    status: "Needs Loop",
    summary: "Not directly patched in this loop; typecheck reports loyalty and progress component mismatches.",
    blockers: ["loyalty-engine returns xp where xp_points is expected.", "XP stats card passes unsupported Progress prop."],
  },
  {
    module: "Shared UI / Dependencies",
    status: "Failing",
    summary: "Shared component exports and dependencies are the highest-leverage next cleanup area.",
    blockers: ["react-day-picker missing.", "@radix-ui/react-label missing.", "buttonVariants, CardDescription, and CardAction references are unresolved."],
  },
];

const verification: Verification[] = [
  {
    command: "npm test",
    status: "Passed",
    result: "2 test files passed, 39 tests passed.",
  },
  {
    command: "npx eslint src/lib/supabase/client.ts src/lib/supabase/server.ts",
    status: "Passed",
    result: "Supabase helper scoped lint passed.",
  },
  {
    command: "npx eslint POS void + shift close routes",
    status: "Passed",
    result: "Scoped POS route lint passed after Next.js 16 params patch.",
  },
  {
    command: "npm run lint",
    status: "Failed",
    result: "913 problems: 521 errors and 392 warnings.",
  },
  {
    command: "npx tsc --noEmit --pretty false",
    status: "Failed",
    result: "POS route validator errors were removed; remaining blockers are now shared UI, Purchasing pages, POS orders, Arkiv desktop, HRIS, CRM/XP.",
  },
  {
    command: "npm run build",
    status: "Stopped",
    result: "Local build did not progress past optimized production build; CI/Vercel compile previously reached prerender.",
  },
];

const nextLoops: LoopItem[] = [
  {
    title: "Deployment stabilization",
    priority: "High",
    tasks: [
      "Confirm Vercel preview redeploy after latest commits.",
      "Set Supabase env for preview and production.",
      "Inspect next Vercel failure, if any.",
    ],
  },
  {
    title: "Shared UI and dependency cleanup",
    priority: "High",
    tasks: [
      "Resolve react-day-picker and @radix-ui/react-label imports.",
      "Restore or replace buttonVariants, CardDescription, and CardAction references.",
      "Re-run typecheck after shared UI cleanup.",
    ],
  },
  {
    title: "Module typecheck pass",
    priority: "High",
    tasks: [
      "Fix dashboard nav icon typing.",
      "Fix Purchasing page type mismatches.",
      "Fix POS orders type mismatch and Arkiv desktop union branches.",
    ],
  },
  {
    title: "Lint gate strategy",
    priority: "Medium",
    tasks: [
      "Decide whether scripts/*.js should be excluded from strict TypeScript ESLint.",
      "Replace high-risk any usage with typed API row shapes.",
      "Fix React Compiler lint errors before cosmetic unused-variable cleanup.",
    ],
  },
];

const statusStyles: Record<Status, string> = {
  Fixed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Passing: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failing: "border-red-200 bg-red-50 text-red-700",
  "Needs Loop": "border-amber-200 bg-amber-50 text-amber-700",
};

const verificationStyles: Record<Verification["status"], string> = {
  Passed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Stopped: "border-slate-200 bg-slate-50 text-slate-700",
};

const priorityStyles: Record<Priority, string> = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
};

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-pink-700 shadow-sm">
        <Icon className="size-3.5" />
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p>
    </div>
  );
}

export default function EngineeringLoopPage() {
  return (
    <main className="min-h-screen bg-[#fff7fb] text-slate-950">
      <section className="relative overflow-hidden border-b border-pink-100 bg-[#fdf2f8]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(219,39,119,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(219,39,119,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1fr_380px] lg:py-12">
          <div className="flex flex-col justify-between gap-8">
            <nav className="flex items-center justify-between">
              <Link href="/arkiv-os" className="inline-flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Image src="/logos/logo.png" alt="Arkiv OS" width={30} height={30} className="h-8 w-auto object-contain" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-950">Arkiv OS</span>
                  <span className="text-xs font-medium text-slate-500">Engineering Loop Report</span>
                </span>
              </Link>
              <Link
                href="/qa"
                className="hidden h-10 items-center gap-2 rounded-lg bg-pink-600 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-500/20 transition hover:bg-pink-700 sm:inline-flex"
              >
                Buka QA
                <ArrowRight className="size-4" />
              </Link>
            </nav>

            <div className="max-w-4xl">
              <Badge className="border-pink-200 bg-white text-pink-700">Engineering loop · 10 Juni 2026</Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
                Loop engineering report untuk Arkiv Projects
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                Ringkasan audit build, lint, typecheck, test, deploy readiness, dan module health. Halaman ini adalah versi web dari
                report markdown agar mudah dibuka di `arkivworld.com/loop` dan dibagikan ke programmer lain.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className={`mb-4 flex size-10 items-center justify-center rounded-lg ${item.tone}`}>
                    <item.icon className="size-5" />
                  </div>
                  <div className="text-3xl font-semibold text-slate-950">{item.value}</div>
                  <div className="mt-1 text-sm font-medium text-slate-500">{item.label}</div>
                  <div className="mt-3 text-xs text-slate-400">{item.helper}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-xl shadow-pink-200/40 backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-pink-600 text-white">
                <Activity className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Loop Snapshot</h2>
                <p className="text-sm text-slate-500">Branch codex/pos-profit-readme</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ["Latest commit", "2dfed44"],
                ["Report source", "docs/qa/ENGINEERING_LOOP_REPORT_2026-06-10.md"],
                ["Primary risk", "Global type/lint debt"],
                ["Deploy focus", "Supabase env + prerender"],
                ["Next best loop", "Shared UI cleanup"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-pink-100 bg-pink-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pink-700">
                <FileText className="size-4" />
                Markdown Report
              </div>
              <p className="text-sm leading-6 text-slate-600">
                File markdown tetap menjadi sumber handoff teknis. Halaman ini mengubah isinya menjadi dashboard yang lebih cepat discan.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <SectionHeader
          icon={ShieldCheck}
          eyebrow="Applied Fixes"
          title="Fix yang sudah masuk dalam loop ini"
          description="Perubahan difokuskan pada deploy blocker dan typecheck blocker yang aman diperbaiki tanpa menyentuh flow bisnis terlalu luas."
        />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Supabase build safety",
              body: "Browser dan server helper sekarang lebih aman saat prerender Vercel tanpa env publishable.",
              icon: Rocket,
            },
            {
              title: "POS route params",
              body: "Void order dan close shift memakai signature params Promise sesuai Next.js 16.",
              icon: Wrench,
            },
            {
              title: "Purchasing API typing",
              body: "Dashboard total, delivery PO guard, dan GRN unit cost typing diperbaiki.",
              icon: ClipboardList,
            },
          ].map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
                <item.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <SectionHeader
          icon={Layers3}
          eyebrow="Module Health"
          title="Status per area"
          description="Status ini bukan final QA approval. Ini snapshot engineering dari lint, typecheck, tests, dan deploy readiness."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {moduleStatus.map((item) => (
            <article key={item.module} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{item.module}</h3>
                <Badge className={statusStyles[item.status]}>{item.status}</Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
              <div className="mt-4 space-y-2">
                {item.blockers.map((blocker) => (
                  <div key={blocker} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span>{blocker}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <SectionHeader
          icon={TestTube2}
          eyebrow="Verification"
          title="Hasil command verification"
          description="Command yang sudah dijalankan dalam loop ini, termasuk yang pass dan yang masih menjadi backlog."
        />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_120px_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
            <div>Command</div>
            <div>Status</div>
            <div>Result</div>
          </div>
          {verification.map((item) => (
            <div key={item.command} className="grid grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 last:border-0 md:grid-cols-[1fr_120px_1.2fr] md:items-center">
              <code className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-white">{item.command}</code>
              <Badge className={verificationStyles[item.status]}>{item.status}</Badge>
              <p className="text-sm leading-6 text-slate-600">{item.result}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <SectionHeader
          icon={Activity}
          eyebrow="Next Loops"
          title="Prioritas engineering loop berikutnya"
          description="Urutan ini dibuat agar tim tidak mencoba memperbaiki seluruh debt sekaligus. Mulai dari yang paling memblokir deploy dan typecheck."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {nextLoops.map((loop) => (
            <article key={loop.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{loop.title}</h3>
                <Badge className={priorityStyles[loop.priority]}>{loop.priority}</Badge>
              </div>
              <ol className="space-y-3">
                {loop.tasks.map((task, index) => (
                  <li key={task} className="flex gap-3 text-sm leading-6 text-slate-600">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-pink-700">
                      {index + 1}
                    </span>
                    <span>{task}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-4 md:px-8">
        <div className="rounded-2xl border border-pink-100 bg-pink-600 p-6 text-white shadow-xl shadow-pink-200/40 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-pink-100">
                <CheckCircle2 className="size-4" />
                Current conclusion
              </div>
              <h2 className="text-2xl font-semibold">Immediate deploy blocker has been addressed; global debt remains.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-pink-50">
                The app is closer to preview deployment stability, but full lint and typecheck are not yet ready to become merge gates.
                The next highest leverage pass is shared UI dependency/export cleanup.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link href="/qa" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-pink-700 transition hover:bg-pink-50">
                Buka QA
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/arkiv-os" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
                Arkiv OS
                <XCircle className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
