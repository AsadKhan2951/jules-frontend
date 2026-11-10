/**
 * Photos from a Mac / iPhone are often HEIC, which Chrome and Edge cannot open.
 * These helpers turn any photo the user picks into a normal JPEG in the browser:
 * - Safari opens HEIC itself;
 * - other browsers load the free heic2any converter on demand (only when a HEIC is picked).
 */

/** File-picker filter: all images, plus HEIC/HEIF which some systems don't list as image/*. */
export const IMAGE_ACCEPT = "image/*,.heic,.heif";

export const isHeic = (file: File) => /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

const HEIC2ANY_URL = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
let heic2anyLoading: Promise<any> | null = null;

function loadHeic2any(): Promise<any> {
  const existing = (window as any).heic2any;
  if (existing) return Promise.resolve(existing);
  if (!heic2anyLoading) {
    heic2anyLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = HEIC2ANY_URL;
      script.async = true;
      script.onload = () => ((window as any).heic2any ? resolve((window as any).heic2any) : reject(new Error("HEIC converter did not load")));
      script.onerror = () => {
        heic2anyLoading = null;
        reject(new Error("Could not load the HEIC converter — check the internet connection"));
      };
      document.head.appendChild(script);
    });
  }
  return heic2anyLoading;
}

const jpegName = (name: string) => name.replace(/\.[^.]+$/, "") + ".jpg";

/** Open any picked photo as a bitmap (EXIF rotation applied). Converts HEIC when the browser can't. */
export async function decodePhoto(file: Blob & { name?: string; type: string }): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    if (!(file instanceof File) || !isHeic(file)) throw error;
    const jpeg = await heicToJpeg(file);
    return createImageBitmap(jpeg, { imageOrientation: "from-image" });
  }
}

/** HEIC → JPEG file, at most `maxSide` pixels on the long side. Other files are returned unchanged. */
export async function heicToJpeg(file: File, maxSide = Number.POSITIVE_INFINITY): Promise<File> {
  if (!isHeic(file)) return file;
  const encode = async (bitmap: ImageBitmap) => {
    try {
      const blob = await bitmapToJpeg(bitmap, Math.min(maxSide, Math.max(bitmap.width, bitmap.height)), 0.9);
      return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
    } finally {
      bitmap.close();
    }
  };
  // Safari can decode HEIC natively.
  let native: ImageBitmap | null = null;
  try {
    native = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    native = null;
  }
  if (native) return encode(native);

  const heic2any = await loadHeic2any();
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob: Blob = Array.isArray(result) ? result[0] : result;
  return encode(await createImageBitmap(blob, { imageOrientation: "from-image" }));
}

function bitmapToJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Canvas is not available"));
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Could not encode image"))), "image/jpeg", quality));
}

/** Resize any photo (JPG, PNG, WEBP, HEIC…) to a JPEG data URL ready for upload. */
export async function photoToJpegDataUrl(file: File, maxSide: number, quality = 0.85): Promise<{ base64: string; contentType: string; filename: string }> {
  const bitmap = await decodePhoto(file);
  try {
    const blob = await bitmapToJpeg(bitmap, maxSide, quality);
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { base64, contentType: "image/jpeg", filename: jpegName(file.name) };
  } finally {
    bitmap.close();
  }
}
