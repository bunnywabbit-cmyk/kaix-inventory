// Uploaded photos are stored on Cloudinary at whatever resolution the
// camera/browser sent (often several MB), but almost everywhere in this app
// they're only ever shown as small thumbnails (24-80px). Cloudinary supports
// resizing/optimizing on the fly via URL segments, so instead of downloading
// the original for every list row, this asks Cloudinary for an
// appropriately-sized, auto-compressed version — no re-upload or backend
// work needed.
//
// `px` should be roughly 2x the CSS display size, so it still looks sharp on
// high-DPI screens.
// Generic on purpose: callers pass either a plain `string` or a nullable
// `string | null | undefined` field straight from the API, and the return
// type mirrors whatever they passed in — so this drops into an existing
// `src={...}` without every call site needing a `?? undefined` fallback.
export function cldThumb<T extends string | null | undefined>(url: T, px: number): T {
  if (!url) return url;
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  // Not a Cloudinary delivery URL (e.g. a local blob: preview before upload
  // finishes, or a non-Cloudinary path) — leave it untouched.
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;
  const insertAt = idx + marker.length;
  const size = Math.round(px);
  return `${url.slice(0, insertAt)}w_${size},h_${size},c_fill,g_auto,q_auto,f_auto/${url.slice(insertAt)}` as T;
}
