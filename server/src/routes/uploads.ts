import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError } from "../lib/httpError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Files pass through in memory rather than to local disk — they're handed
// straight to Cloudinary and never touch this server's filesystem.
// 10MB matches Cloudinary's free-plan per-image cap — raising this further
// wouldn't help, uploads would just fail on Cloudinary's side instead.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestError("Only JPEG, PNG, WEBP, or GIF images are allowed."));
      return;
    }
    callback(null, true);
  },
});

function uploadBufferToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "kaix-inventory" },
      (error, result) => {
        if (error || !result) {
          reject(error instanceof Error ? error : new Error("Cloudinary upload failed."));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export const uploadsRouter = Router();

uploadsRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError("No image file was uploaded.");
    }
    const url = await uploadBufferToCloudinary(req.file.buffer);
    res.status(201).json({ url });
  }),
);
