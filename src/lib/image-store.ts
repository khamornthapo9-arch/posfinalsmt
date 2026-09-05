import { supabase } from "@/integrations/supabase/client";

/** Max pixel dimension for stored product photos. */
const MAX_DIMENSION = 800;
/** Target compressed size in bytes (~150 KB). */
const TARGET_BYTES = 150 * 1024;

export const ITEM_IMAGE_BUCKET = "item-images";
/** ~10 years, so stored URLs behave like permanent links. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-decode-failed"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("image-encode-failed"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Downscales and re-encodes a user-picked photo to a small JPEG so uploads stay
 * fast on slow connections and the catalog renders smoothly.
 */
export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let blob = await toBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.4) {
    quality -= 0.12;
    blob = await toBlob(canvas, quality);
  }
  return blob;
}

/** Compresses and uploads a product photo, returning a long-lived URL. */
export async function uploadItemImage(file: File, storeId: string): Promise<string> {
  const blob = await compressImage(file);
  const path = `${storeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(ITEM_IMAGE_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(ITEM_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("sign-failed");
  return data.signedUrl;
}
