import { createBrowserClient } from "@/lib/pg/browser-client";
import type { Candidate, Brand } from "@/types";
import type { PipelineStage } from "./types";

export async function fetchPipelineCandidates(): Promise<Candidate[]> {
  const db = createBrowserClient();
  const { data, error } = await db
    .from("candidates")
    .select("*, brands(name), positions(title)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Candidate[]) ?? [];
}

export async function fetchPipelineBrands(): Promise<Brand[]> {
  const db = createBrowserClient();
  const { data, error } = await db
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data as Brand[]) ?? [];
}

export async function updateCandidateStage(id: string, status: PipelineStage) {
  const db = createBrowserClient();
  const { error } = await db
    .from("candidates")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
