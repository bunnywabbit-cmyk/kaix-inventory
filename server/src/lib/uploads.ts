import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function deleteUploadedFile(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;

  const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
  // Guard against a crafted imageUrl escaping the uploads directory.
  if (path.dirname(filePath) !== UPLOADS_DIR) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
