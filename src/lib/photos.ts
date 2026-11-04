import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Private bucket: no storage policies, so only the service role touches files. */
const BUCKET = "request-photos";
const MAX_BYTES = 2 * 1024 * 1024;
const SIGNED_FOR = 10 * 60;

export type PhotoKind = "box" | "prescription";
export const PHOTO_KINDS: PhotoKind[] = ["box", "prescription"];

/** A file from the form that is a real JPEG or WebP under the size cap, or null. */
export async function readPhoto(value: FormDataEntryValue | null): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!(value instanceof File) || value.size === 0 || value.size > MAX_BYTES) return null;
  const bytes = new Uint8Array(await value.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (!jpeg && !webp) return null;
  return { bytes, type: jpeg ? "image/jpeg" : "image/webp" };
}

/** Stores the photo and records it. Box photos are shared with pharmacies unless staff turn that off. */
export async function savePhoto(requestId: string, kind: PhotoKind, photo: { bytes: Uint8Array; type: string }): Promise<boolean> {
  const admin = createAdminClient();
  const path = `${requestId}/${kind}-${crypto.randomUUID()}.${photo.type === "image/jpeg" ? "jpg" : "webp"}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, photo.bytes, { contentType: photo.type });
  if (error) return false;
  const { error: rowError } = await admin.from("request_photos").insert({ request_id: requestId, kind, path, shared: kind === "box" });
  if (rowError) {
    await admin.storage.from(BUCKET).remove([path]);
    return false;
  }
  return true;
}

/** Short-lived links for paths the caller was already allowed to see (checked by RLS or an RPC). */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(paths, SIGNED_FOR);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** Deletes photos of requests closed over 30 days ago (or older than 90 days): files first, then rows. */
export async function purgeStalePhotos(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("stale_photos");
  const rows = (data ?? []) as { id: string; path: string }[];
  if (!rows.length) return;
  const { error } = await admin.storage.from(BUCKET).remove(rows.map((r) => r.path));
  if (!error) await admin.from("request_photos").delete().in("id", rows.map((r) => r.id));
}
