/**
 * Groups jewellery photos into products.
 *
 * Tested on the real Shaikha folders: photos of one piece are shot in a burst, so
 * the capture time (EXIF) is the reliable signal. Looks alone are NOT reliable —
 * two angles of one jhumka differ as much as two different jhumkas — so look-alike
 * matching is only used to catch near-identical duplicates.
 *
 * 1. Photos with a capture time: taken within a few minutes of each other = one product.
 * 2. Photos without a capture time: one product each, except near-identical copies.
 * Everything is a suggestion; the review screen lets the user fix it.
 */

export type PhotoFeatures = {
  key: string;
  /** Capture time in ms, or null when the photo has no EXIF date. */
  time: number | null;
  /** 16×16 brightness map of the cropped piece (256 values, 0–1). */
  shape: number[];
  /** Width / height of the cropped piece. */
  aspect: number;
};

export const GROUPING = {
  /** Photos of one piece are taken within this gap. */
  burstGapMs: 5 * 60 * 1000,
  /** Below this distance two photos are copies of the same shot. */
  duplicateDistance: 0.1,
};

/** 0 = identical; same-shot copies are below ~0.1, different photos are well above. */
export function shapeDistance(a: PhotoFeatures, b: PhotoFeatures) {
  let sum = 0;
  const n = Math.min(a.shape.length, b.shape.length) || 1;
  for (let i = 0; i < n; i++) sum += Math.abs((a.shape[i] ?? 0) - (b.shape[i] ?? 0));
  const aspect = Math.abs(a.aspect - b.aspect) / Math.max(a.aspect, b.aspect, 1e-6);
  return sum / n + 0.5 * aspect;
}

/** Returns groups of photo keys; each group = one suggested product. */
export function groupPhotos(photos: PhotoFeatures[]): string[][] {
  const dated = photos.filter(p => p.time !== null).sort((a, b) => a.time! - b.time! || a.key.localeCompare(b.key));
  const undated = photos.filter(p => p.time === null).sort((a, b) => a.key.localeCompare(b.key));

  const groups: PhotoFeatures[][] = [];
  for (const photo of dated) {
    const last = groups[groups.length - 1];
    if (last && photo.time! - last[last.length - 1]!.time! <= GROUPING.burstGapMs) last.push(photo);
    else groups.push([photo]);
  }

  // Undated: join a group only as a near-identical copy of one of its photos.
  for (const photo of undated) {
    let target: PhotoFeatures[] | null = null;
    let best = GROUPING.duplicateDistance;
    for (const group of groups) {
      for (const member of group) {
        const distance = shapeDistance(photo, member);
        if (distance <= best) {
          best = distance;
          target = group;
        }
      }
    }
    if (target) target.push(photo);
    else groups.push([photo]);
  }

  return groups.map(group => group.map(photo => photo.key));
}
