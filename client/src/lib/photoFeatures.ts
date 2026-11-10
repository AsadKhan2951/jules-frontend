import type { PhotoFeatures } from "./photoGrouping";

/**
 * Reads what the grouping needs from a photo, in the browser:
 * EXIF capture time (DateTimeOriginal, else DateTime) and a small visual fingerprint.
 */

/** Minimal EXIF reader for JPEG: returns capture time in ms (local time treated as UTC) or null. */
export async function readCaptureTime(file: File): Promise<number | null> {
  try {
    const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 4) return null;
    if (view.getUint16(0) !== 0xffd8) return await readHeifCaptureTime(file);
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
        return parseExif(view, offset + 10);
      }
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
      offset += 2 + size;
    }
  } catch {
    // unreadable header
  }
  return null;
}

/** HEIC/HEIF (iPhone, Mac): find the "Exif\0\0" block followed by a TIFF header and read it. */
async function readHeifCaptureTime(file: File): Promise<number | null> {
  const buffer = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let i = 0; i + 10 < bytes.length; i++) {
    if (bytes[i] !== 0x45 || bytes[i + 1] !== 0x78 || bytes[i + 2] !== 0x69 || bytes[i + 3] !== 0x66 || bytes[i + 4] !== 0 || bytes[i + 5] !== 0) continue;
    const tiff = i + 6;
    const order = view.getUint16(tiff);
    if (order !== 0x4949 && order !== 0x4d4d) continue;
    try {
      const time = parseExif(view, tiff);
      if (time) return time;
    } catch {
      // keep looking
    }
  }
  return null;
}

function parseExif(view: DataView, tiff: number): number | null {
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const readAscii = (at: number, length: number) => {
    let text = "";
    for (let i = 0; i < length && at + i < view.byteLength; i++) {
      const code = view.getUint8(at + i);
      if (!code) break;
      text += String.fromCharCode(code);
    }
    return text;
  };
  const readIfd = (ifd: number, wanted: number[]) => {
    const found: Record<number, number> = {};
    if (ifd + 2 > view.byteLength) return found;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = u16(entry);
      if (wanted.includes(tag)) found[tag] = entry;
    }
    return found;
  };
  const dateAt = (entry: number | undefined) => {
    if (entry === undefined) return null;
    const text = readAscii(tiff + u32(entry + 8), 19); // "YYYY:MM:DD HH:MM:SS"
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    if (!match) return null;
    const [, y, mo, d, h, mi, s] = match.map(Number) as number[];
    const time = Date.UTC(y!, mo! - 1, d!, h!, mi!, s!);
    return Number.isFinite(time) && y! > 1990 ? time : null;
  };

  const ifd0 = tiff + u32(tiff + 4);
  const tags0 = readIfd(ifd0, [0x8769, 0x0132]);
  if (tags0[0x8769] !== undefined) {
    const exifIfd = tiff + u32(tags0[0x8769]! + 8);
    const original = dateAt(readIfd(exifIfd, [0x9003])[0x9003]);
    if (original) return original;
  }
  return dateAt(tags0[0x0132]);
}

/**
 * Decodes the photo once: returns a 220px-wide preview (object URL, for the review
 * screen) plus a 16×16 brightness map of the piece, cropped away from the backdrop.
 */
export async function analysePhoto(file: File): Promise<Pick<PhotoFeatures, "shape" | "aspect"> & { preview: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: 220, resizeQuality: "medium" });
  try {
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = bitmap.width;
    previewCanvas.height = bitmap.height;
    previewCanvas.getContext("2d", { willReadFrequently: true })?.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => previewCanvas.toBlob(resolve, "image/jpeg", 0.72));
    const preview = blob ? URL.createObjectURL(blob) : "";

    const box = foregroundBox(previewCanvas);
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not available");
    ctx.imageSmoothingQuality = "medium";
    ctx.drawImage(previewCanvas, box.x, box.y, box.w, box.h, 0, 0, 16, 16);
    const pixels = ctx.getImageData(0, 0, 16, 16).data;
    const grey: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) grey.push(0.299 * pixels[i]! + 0.587 * pixels[i + 1]! + 0.114 * pixels[i + 2]!);
    const max = Math.max(...grey) || 1;
    return { shape: grey.map(value => value / max), aspect: box.w / Math.max(1, box.h), preview };
  } finally {
    bitmap.close();
  }
}

/** Bounding box of pixels that are not plain backdrop (near-black / near-white). */
function foregroundBox(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } {
  const full = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !canvas.width || !canvas.height) return full;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      const r = data[at]!, g = data[at + 1]!, b = data[at + 2]!;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max < 48 || min > 215) continue;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  // Busy photos (model, table, hand): no clear backdrop, keep the whole frame.
  if (count < 20 || count > width * height * 0.6) return full;
  const pad = 3;
  const x = Math.max(0, minX - pad), y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(width, maxX + pad + 1) - x, h: Math.min(height, maxY + pad + 1) - y };
}
