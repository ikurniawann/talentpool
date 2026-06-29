type DbError = { message: string; code?: string } | null | undefined;

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function throwIfDbError(error: DbError) {
  if (error) throw new Error(error.message);
}

export const UNIT_CONVERSION_SELECT = `
  *,
  satuan:units!satuan_id (*)
`;

export function prepareMaterialBody(body: Record<string, unknown>) {
  const next = { ...body };
  for (const key of ["kode", "deskripsi", "satuan_kecil_id", "storage_condition"] as const) {
    if (next[key] === "") next[key] = null;
  }
  return next;
}
