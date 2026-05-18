import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type SessionMessage = { role: "user" | "assistant" | "system"; content: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Intent = "all" | "hris" | "procurement" | "pos" | "inventory";
type DetailRow = Record<string, unknown>;
type Summary = {
  hris: Record<string, number>;
  procurement: Record<string, number>;
  pos: Record<string, number>;
  inventory: Record<string, number>;
  details: Partial<Record<Intent, DetailRow[]>>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const list = searchParams.get("list") === "true";

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    if (list || !sessionId) {
      const { data: sessions, error } = await admin
        .from("ai_assistant_sessions")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return NextResponse.json({ sessions: sessions ?? [] });
    }

    const { data: messages, error } = await admin
      .from("ai_assistant_messages")
      .select("id, role, content, meta, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ messages: messages ?? [] });
  } catch (error) {
    console.error("AI assistant GET error:", error);
    return NextResponse.json({ error: "Gagal memuat history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let prompt = "";
  let intent: Intent = "all";

  try {
    const body = (await request.json()) as { message?: string; history?: ChatMessage[]; session_id?: string };
    prompt = body.message ?? "Summary semua module";
    let sessionId = body.session_id;
    const history = (body.history ?? []).slice(-8);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "AI Assistant hanya tersedia untuk super_admin" }, { status: 403 });
    }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    intent = detectIntent(prompt);
    const summary = await buildSystemSummary(admin, intent);
    const fallbackAnswer = generateSummaryAnswer(prompt, summary, profile.full_name ?? user.email ?? "Super Admin", intent);

    // Create session if none exists (first user message in a fresh chat)
    if (!sessionId) {
      const { data: newSession, error: se } = await admin
        .from("ai_assistant_sessions")
        .insert({ user_id: user.id, title: prompt.slice(0, 120) })
        .select("id")
        .single();
      if (!se && newSession) sessionId = newSession.id;
    } else {
      // Update session timestamp on activity
      await admin.from("ai_assistant_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
    }

    const llmResult = await generateWithOllama({
      message: prompt,
      history,
      summary,
      fallbackAnswer,
      userName: profile.full_name ?? user.email ?? "Super Admin",
      intent,
    });

    // Persist messages
    if (sessionId) {
      const rows: { session_id: string; role: string; content: string; meta?: unknown }[] = [
        { session_id: sessionId, role: "user", content: prompt },
        {
          session_id: sessionId,
          role: "assistant",
          content: llmResult.answer,
          meta: { mode: llmResult.mode, model: llmResult.model, status: llmResult.status, intent },
        },
      ];
      await admin.from("ai_assistant_messages").insert(rows);
    }

    await auditAiRequest(admin, {
      user_id: user.id,
      user_email: user.email,
      prompt,
      intent,
      mode: llmResult.mode,
      model: llmResult.model,
      latency_ms: Date.now() - startedAt,
      error: llmResult.error,
    });

    return NextResponse.json({
      answer: llmResult.answer,
      summary,
      session_id: sessionId,
      meta: {
        mode: llmResult.mode,
        model: llmResult.model,
        intent,
        status: llmResult.status,
        fallbackReason: llmResult.fallbackReason,
        user: user.email,
      },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return NextResponse.json({ error: "Gagal memproses AI Assistant" }, { status: 500 });
  }
}

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  if (lower.includes("hr") || lower.includes("kandidat") || lower.includes("employee") || lower.includes("karyawan")) return "hris";
  if (lower.includes("procurement") || lower.includes("purchasing") || lower.includes("po") || lower.includes("pr") || lower.includes("supplier")) return "procurement";
  if (lower.includes("pos") || lower.includes("sales") || lower.includes("order") || lower.includes("reservasi")) return "pos";
  if (lower.includes("stock") || lower.includes("stok") || lower.includes("inventory") || lower.includes("bahan")) return "inventory";
  return "all";
}

async function safeCount(
  admin: ReturnType<typeof createServiceClient>,
  table: string,
  filter?: (query: any) => any,
): Promise<number> {
  try {
    let query = admin.from(table).select("id", { count: "exact", head: true });
    if (filter) query = filter(query) as typeof query;
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeRows(
  admin: ReturnType<typeof createServiceClient>,
  table: string,
  columns: string,
  options?: {
    filter?: (query: any) => any;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
): Promise<DetailRow[]> {
  try {
    let query = admin.from(table).select(columns);
    if (options?.filter) query = options.filter(query) as typeof query;
    if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    if (options?.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as DetailRow[];
  } catch {
    return [];
  }
}

async function buildSystemSummary(admin: any, intent: Intent): Promise<Summary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    candidatesTotal,
    candidatesToday,
    candidatesNew,
    employeesTotal,
    purchaseRequestsTotal,
    purchaseOrdersTotal,
    purchaseOrdersPending,
    rawMaterialsTotal,
    inventoryItems,
    lowStockItems,
    posOrdersTotal,
    posReservationsTotal,
  ] = await Promise.all([
    safeCount(admin, "candidates"),
    safeCount(admin, "candidates", (q) => q.gte("created_at", todayIso)),
    safeCount(admin, "candidates", (q) => q.eq("status", "new")),
    safeCount(admin, "employees"),
    safeCount(admin, "purchase_requests"),
    safeCount(admin, "purchase_orders"),
    safeCount(admin, "purchase_orders", (q) => q.in("status", ["draft", "pending", "pending_approval", "sent", "pending_head", "pending_finance", "pending_direksi"])),
    safeCount(admin, "raw_materials"),
    safeCount(admin, "inventory"),
    safeCount(admin, "inventory", (q) => q.lt("current_stock", 1)),
    safeCount(admin, "pos_orders"),
    safeCount(admin, "pos_reservations"),
  ]);

  const details: Summary["details"] = {};
  if (intent === "all" || intent === "hris") {
    details.hris = await safeRows(admin, "candidates", "id, full_name, status, source, created_at", {
      order: { column: "created_at", ascending: false },
      limit: 5,
    });
  }
  if (intent === "all" || intent === "procurement") {
    details.procurement = await safeRows(admin, "purchase_orders", "id, po_number, status, total_amount, created_at", {
      filter: (q) => q.in("status", ["draft", "pending", "pending_approval", "sent", "pending_head", "pending_finance", "pending_direksi"]),
      order: { column: "created_at", ascending: false },
      limit: 5,
    });
  }
  if (intent === "all" || intent === "inventory") {
    details.inventory = await safeRows(admin, "inventory", "id, current_stock, minimum_stock, raw_material_id, updated_at", {
      filter: (q) => q.lt("current_stock", 1),
      order: { column: "updated_at", ascending: false },
      limit: 5,
    });
  }
  if (intent === "all" || intent === "pos") {
    details.pos = await safeRows(admin, "pos_orders", "id, order_number, status, total_amount, created_at", {
      order: { column: "created_at", ascending: false },
      limit: 5,
    });
  }

  return {
    hris: { candidatesTotal, candidatesToday, candidatesNew, employeesTotal },
    procurement: { purchaseRequestsTotal, purchaseOrdersTotal, purchaseOrdersPending, rawMaterialsTotal },
    pos: { posOrdersTotal, posReservationsTotal },
    inventory: { inventoryItems, lowStockItems },
    details,
  };
}

async function generateWithOllama({
  message,
  history,
  summary,
  fallbackAnswer,
  userName,
  intent,
}: {
  message: string;
  history: ChatMessage[];
  summary: Summary;
  fallbackAnswer: string;
  userName: string;
  intent: Intent;
}): Promise<{ answer: string; mode: string; model: string; status: "live" | "fallback"; fallbackReason?: string; error?: string }> {
  const baseUrl = (process.env.OLLAMA_API_BASE || process.env.OLLAMA_HOST || "").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
  const apiKey = process.env.OLLAMA_API_KEY;
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT || "120000");

  if (!baseUrl) return { answer: fallbackAnswer, mode: "rule_based_summary_v1", model: "none", status: "fallback", fallbackReason: "LLM belum dikonfigurasi" };

  const systemPrompt = [
    "Kamu adalah Arkiv OS AI Assistant untuk owner/super_admin.",
    "Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan actionable.",
    "Gunakan hanya data JSON summary dan details yang diberikan. Jangan mengarang angka.",
    "Jika data detail tidak tersedia, sebutkan bahwa saat ini baru tersedia summary agregat.",
    "Berikan insight, alert, dan next action. Jangan tampilkan error teknis ke user.",
  ].join(" ");
  const userPrompt = `Nama user: ${userName}\nIntent: ${intent}\nPertanyaan: ${message}\n\nData Arkiv OS:\n${JSON.stringify(summary, null, 2)}\n\nFallback answer:\n${fallbackAnswer}`;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: userPrompt },
  ];

  const headers = { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
  const errors: string[] = [];

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, stream: false, options: { temperature: 0.2, num_ctx: 4096, num_gpu: 1 }, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`/api/chat ${response.status}`);
    const json = await response.json() as { message?: { content?: string }; response?: string };
    const answer = json.message?.content || json.response;
    if (!answer) throw new Error("/api/chat response kosong");
    return { answer, mode: "ollama_api_chat_live", model, status: "live" };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "unknown /api/chat error");
  }

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, temperature: 0.2, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`/v1/chat/completions ${response.status}`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = json.choices?.[0]?.message?.content;
    if (!answer) throw new Error("/v1/chat/completions response kosong");
    return { answer, mode: "ollama_openai_compatible_live", model, status: "live" };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "unknown /v1 error");
  }

  const reason = errors.some((error) => error.includes("429"))
    ? "Kuota/rate limit LLM sedang habis. Saya memakai summary internal sementara."
    : "LLM sedang tidak tersedia. Saya memakai summary internal sementara.";

  return { answer: fallbackAnswer, mode: "ollama_unavailable_fallback", model, status: "fallback", fallbackReason: reason, error: errors.join(" | ") };
}

async function auditAiRequest(admin: any, payload: Record<string, any>) {
  try {
    await admin.from("ai_assistant_logs").insert(payload);
  } catch (error) {
    console.warn("AI audit log skipped:", error instanceof Error ? error.message : error);
  }
}

function generateSummaryAnswer(message: string, summary: Summary, name: string, intent: Intent): string {
  const lower = message.toLowerCase();
  const sections: string[] = [];
  const includeAll = intent === "all" || !lower || lower.includes("semua") || lower.includes("summary") || lower.includes("ringkas") || lower.includes("overview");

  if (includeAll) {
    sections.push(`Halo ${name}, berikut ringkasan Arkiv OS saat ini:`);
    sections.push(formatHris(summary));
    sections.push(formatProcurement(summary));
    sections.push(formatPos(summary));
    sections.push(formatInventory(summary));
    sections.push(formatDetails(summary));
    sections.push("Prioritas: cek kandidat baru, PO pending, dan item inventory low stock.");
    return sections.filter(Boolean).join("\n\n");
  }

  if (intent === "hris") return [formatHris(summary), formatDetails(summary, "hris")].filter(Boolean).join("\n\n");
  if (intent === "procurement") return [formatProcurement(summary), formatDetails(summary, "procurement")].filter(Boolean).join("\n\n");
  if (intent === "pos") return [formatPos(summary), formatDetails(summary, "pos")].filter(Boolean).join("\n\n");
  if (intent === "inventory") return [formatInventory(summary), formatDetails(summary, "inventory")].filter(Boolean).join("\n\n");

  return [formatHris(summary), formatProcurement(summary), formatPos(summary), formatInventory(summary)].join("\n\n");
}

function formatHris(summary: Summary) {
  return `HRIS: ${summary.hris.candidatesTotal} total kandidat, ${summary.hris.candidatesToday} kandidat masuk hari ini, ${summary.hris.candidatesNew} kandidat status new, ${summary.hris.employeesTotal} karyawan tercatat.`;
}

function formatProcurement(summary: Summary) {
  return `Procurement: ${summary.procurement.purchaseRequestsTotal} PR, ${summary.procurement.purchaseOrdersTotal} PO, ${summary.procurement.purchaseOrdersPending} PO perlu perhatian, ${summary.procurement.rawMaterialsTotal} raw material.`;
}

function formatPos(summary: Summary) {
  return `POS: ${summary.pos.posOrdersTotal} order tercatat dan ${summary.pos.posReservationsTotal} reservasi.`;
}

function formatInventory(summary: Summary) {
  return `Inventory: ${summary.inventory.inventoryItems} item inventory, ${summary.inventory.lowStockItems} item low/empty stock.`;
}

function formatDetails(summary: Summary, only?: Intent) {
  const lines: string[] = [];
  const add = (label: string, rows?: DetailRow[]) => {
    if (!rows?.length) return;
    lines.push(`${label}: ${rows.slice(0, 5).map((row) => Object.values(row).filter(Boolean).slice(0, 4).join(" | ")).join("; ")}`);
  };
  if (!only || only === "hris") add("Kandidat terbaru", summary.details.hris);
  if (!only || only === "procurement") add("PO pending terbaru", summary.details.procurement);
  if (!only || only === "inventory") add("Inventory low stock", summary.details.inventory);
  if (!only || only === "pos") add("POS order terbaru", summary.details.pos);
  return lines.join("\n");
}
