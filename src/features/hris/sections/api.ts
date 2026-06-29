import { createBrowserClient } from "@/lib/pg/browser-client";
import { buildListUrl, apiGet, apiPost, apiDelete } from "@/lib/api-client";
import type {
  SectionBrand,
  SectionStaffMember,
  SectionItem,
  StaffSectionLink,
  CreateSectionPayload,
  AssignStaffSectionPayload,
} from "./types";

export const fetchSectionStaff = (brandFilter: string) =>
  apiGet<{ data: SectionStaffMember[] }>(
    buildListUrl("/api/staff", {
      brand_id: brandFilter !== "all" ? brandFilter : undefined,
      status: "active",
    })
  ).then((res) => res.data || []);

export const fetchSections = (brandFilter: string) =>
  apiGet<{ data: SectionItem[] }>(
    buildListUrl("/api/sections", {
      brand_id: brandFilter !== "all" ? brandFilter : undefined,
    })
  ).then((res) => res.data || []);

export const fetchStaffSections = () =>
  apiGet<{ data: StaffSectionLink[] }>("/api/staff-sections").then(
    (res) => res.data || []
  );

export async function fetchSectionBrands(): Promise<SectionBrand[]> {
  const db = createBrowserClient();
  const { data } = await db
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data as SectionBrand[]) || [];
}

export const createSection = (body: CreateSectionPayload) =>
  apiPost<{ data: SectionItem }>("/api/sections", body);

export const assignStaffSection = (body: AssignStaffSectionPayload) =>
  apiPost<{ data: StaffSectionLink }>("/api/staff-sections", body);

export const removeStaffSection = (staffId: string, sectionId: string) =>
  apiDelete(`/api/staff-sections?staff_id=${staffId}&section_id=${sectionId}`);

export const deleteSection = (id: string) =>
  apiDelete(`/api/sections?id=${id}`);
