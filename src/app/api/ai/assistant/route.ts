import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { appendFile, mkdir } from "fs/promises";
import path from "path";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Intent = "all" | "hris" | "procurement" | "pos" | "inventory";
type DetailRow = Record<string, unknown>;
type SupabaseQueryResult = { data?: unknown[] | null; error?: unknown; count?: number | null };
type SupabaseQuery = PromiseLike<SupabaseQueryResult> & {
  eq(column: string, value: unknown): SupabaseQuery;
  gte(column: string, value: unknown): SupabaseQuery;
  lt(column: string, value: unknown): SupabaseQuery;
  in(column: string, values: readonly unknown[]): SupabaseQuery;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
};
type SupabaseAdmin = {
  from(table: string): {
    select(columns?: string, options?: Record<string, unknown>): SupabaseQuery;
    insert(values: unknown): SupabaseQuery;
  };
};
type LlmResult = {
  answer: string;
  mode: string;
  model: string;
  status: "live" | "fallback";
  provider?: "ollama" | "internal";
  fallbackReason?: string;
  error?: string;
};
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

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    intent = detectIntent(prompt);
    const summary = await buildSystemSummary(admin as unknown as SupabaseAdmin, intent);
    const fallbackAnswer = generateSummaryAnswer(prompt, summary, profile?.full_name ?? user.email ?? "User", intent);

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

    const persistedHistory = sessionId ? await loadSessionHistory(admin as unknown as SupabaseAdmin, sessionId) : [];
    const mergedHistory = compactChatHistory([...persistedHistory, ...history]);

    const llmResult = await generateWithOllama({
      message: prompt,
      history: mergedHistory,
      summary,
      fallbackAnswer,
      userName: profile?.full_name ?? user.email ?? "User",
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

    await appendAssistantMarkdown({
      userId: user.id,
      userEmail: user.email ?? "unknown",
      userName: profile?.full_name ?? user.email ?? "User",
      sessionId,
      prompt,
      answer: llmResult.answer,
      model: llmResult.model,
    });

    await auditAiRequest(admin as unknown as SupabaseAdmin, {
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

function compactChatHistory(history: ChatMessage[]): ChatMessage[] {
  const compacted: ChatMessage[] = [];
  let budget = 5000;

  for (const item of history.slice(-12).reverse()) {
    const maxLength = item.role === "assistant" ? 900 : 700;
    const content = item.content.replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (!content) continue;

    budget -= content.length;
    if (budget < 0) break;
    compacted.push({ role: item.role, content });
  }

  return compacted.reverse();
}

async function safeCount(
  admin: SupabaseAdmin,
  table: string,
  filter?: (query: SupabaseQuery) => SupabaseQuery,
): Promise<number> {
  try {
    let query = admin.from(table).select("id", { count: "exact", head: true }) as unknown as SupabaseQuery;
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeRows(
  admin: SupabaseAdmin,
  table: string,
  columns: string,
  options?: {
    filter?: (query: SupabaseQuery) => SupabaseQuery;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
): Promise<DetailRow[]> {
  try {
    let query = admin.from(table).select(columns) as unknown as SupabaseQuery;
    if (options?.filter) query = options.filter(query);
    if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    if (options?.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error || !data) return [];
    return data as DetailRow[];
  } catch {
    return [];
  }
}

async function buildSystemSummary(admin: SupabaseAdmin, intent: Intent): Promise<Summary> {
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
}): Promise<LlmResult> {
  const baseUrl = (process.env.AI_ASSISTANT_OLLAMA_API_BASE || "http://127.0.0.1:11434")
    .replace(/^http:\/\/localhost(?=:|\/|$)/, "http://127.0.0.1")
    .replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "kimi-k2.6:cloud";
  const apiKey = process.env.OLLAMA_API_KEY;
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT || "120000");

  const systemPrompt = [
    "Kamu adalah Arkiv OS AI Assistant untuk semua user Arkiv OS.",
    "Kamu boleh diajak ngobrol bebas sebagai agent/asisten, tidak terbatas hanya summary dashboard.",
    "Jawab dalam Bahasa Indonesia yang ramah, jelas, dan actionable.",
    "Jika user bertanya data bisnis Arkiv OS, gunakan data JSON summary/details yang tersedia dan jangan mengarang angka.",
    "Jika user meminta ide, strategi, copywriting, SOP, analisis, atau bantuan umum, bantu secara bebas tanpa harus memaksa summary dashboard.",
    "Ingat konteks percakapan dari history yang diberikan.",
  ].join(" ");
  const userPrompt = `Nama user: ${userName}\nIntent terdeteksi: ${intent}\nPertanyaan user: ${message}\n\nData Arkiv OS opsional jika relevan:\n${JSON.stringify(summary, null, 2)}`;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: userPrompt },
  ];

  const errors: string[] = [];

  if (!baseUrl) {
    return {
      answer: fallbackAnswer,
      mode: "rule_based_summary_v1",
      model: "none",
      provider: "internal",
      status: "fallback",
      fallbackReason: "OLLAMA_API_BASE belum dikonfigurasi",
    };
  }

  const headers = buildOllamaHeaders(baseUrl, apiKey);
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, stream: false, options: { temperature: 0.7, num_ctx: 4096, num_gpu: 1 }, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`/api/chat ${response.status}: ${await response.text()}`);
    const json = await response.json() as { message?: { content?: string }; response?: string };
    const answer = json.message?.content || json.response;
    if (!answer) throw new Error("/api/chat response kosong");
    return { answer, mode: "ollama_api_chat_live", model, provider: "ollama", status: "live" };
  } catch (error) {
    errors.push(formatProviderError(error, "/api/chat"));
  }

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, temperature: 0.7, messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`/v1/chat/completions ${response.status}: ${await response.text()}`);
    const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = json.choices?.[0]?.message?.content;
    if (!answer) throw new Error("/v1/chat/completions response kosong");
    return { answer, mode: "ollama_chat_completions_live", model, provider: "ollama", status: "live" };
  } catch (error) {
    errors.push(formatProviderError(error, "/v1"));
  }

  console.warn("AI assistant Ollama fallback:", errors.join(" | "));

  return {
    answer: fallbackAnswer,
    mode: "ollama_unavailable_fallback",
    model,
    provider: "internal",
    status: "fallback",
    fallbackReason: "Ollama sedang tidak tersedia. Saya memakai fallback internal sementara.",
    error: errors.join(" | "),
  };
}

function buildOllamaHeaders(baseUrl: string, apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(baseUrl);
  if (apiKey && !isLocal) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

function formatProviderError(error: unknown, endpoint: string): string {
  if (!(error instanceof Error)) return `${endpoint}: unknown error`;
  const cause = error.cause as { code?: string; address?: string; port?: number; message?: string } | undefined;
  const causeText = cause ? ` cause=${JSON.stringify({ code: cause.code, address: cause.address, port: cause.port, message: cause.message })}` : "";
  return `${endpoint}: ${error.name}: ${error.message}${causeText}`;
}

async function loadSessionHistory(admin: SupabaseAdmin, sessionId: string): Promise<ChatMessage[]> {
  try {
    const { data } = await admin
      .from("ai_assistant_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(40);
    return ((data ?? []) as Array<{ role?: string; content?: unknown }>)
      .filter((item): item is ChatMessage => (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content }));
  } catch {
    return [];
  }
}

async function appendAssistantMarkdown(payload: {
  userId: string;
  userEmail: string;
  userName: string;
  sessionId?: string;
  prompt: string;
  answer: string;
  model: string;
}) {
  try {
    const logsDir = path.join(process.cwd(), "assistant-memory");
    await mkdir(logsDir, { recursive: true });
    const safeUser = payload.userEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(logsDir, `${safeUser}.assistant.md`);
    const block = [
      `\n\n---`,
      `date: ${new Date().toISOString()}`,
      `user: ${payload.userName} <${payload.userEmail}>`,
      `user_id: ${payload.userId}`,
      `session_id: ${payload.sessionId ?? "none"}`,
      `model: ${payload.model}`,
      `\n## User`,
      payload.prompt,
      `\n## Assistant`,
      payload.answer,
    ].join("\n");
    await appendFile(filePath, block, "utf8");
  } catch (error) {
    console.warn("assistant.md write skipped:", error instanceof Error ? error.message : error);
  }
}

async function auditAiRequest(admin: SupabaseAdmin, payload: Record<string, unknown>) {
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
