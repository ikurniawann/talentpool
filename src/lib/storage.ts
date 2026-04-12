import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Upload file to Supabase Storage
 * Uses service role key (server-side only)
 */
export async function uploadFile(
  bucket: string,
  file: File | Buffer,
  folder: string = ""
): Promise<{ url: string; error: string | null }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file instanceof File ? file.name.split(".").pop() ?? "bin" : "bin";
  const fileName = folder
    ? `${folder}/${timestamp}-${random}.${ext}`
    : `${timestamp}-${random}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: file instanceof File ? file.type : "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return { url: "", error: error.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(bucket: string, fileUrl: string): Promise<{ error: string | null }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extract path from URL
  const urlObj = new URL(fileUrl);
  const pathParts = urlObj.pathname.split(`/storage/v1/object/${bucket}/`);
  if (pathParts.length < 2) return { error: "Invalid file URL" };

  const filePath = decodeURIComponent(pathParts[1]);

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  return { error: error?.message ?? null };
}

/**
 * Validate file type and size
 */
export function validateFile(
  file: File,
  allowedMimeTypes: string[],
  maxSizeBytes: number
): string | null {
  if (!allowedMimeTypes.includes(file.type)) {
    return `Tipe file tidak valid. Allowed: ${allowedMimeTypes.join(", ")}`;
  }
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
    return `Ukuran file terlalu besar. Maksimal ${maxMB}MB`;
  }
  return null;
}
