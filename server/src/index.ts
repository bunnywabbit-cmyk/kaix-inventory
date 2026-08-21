import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./lib/errorHandler.js";
import { prisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import { activityLogRouter } from "./routes/activityLog.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { dtfPrintOrdersRouter } from "./routes/dtfPrintOrders.js";
import { dtfPrintStockRouter } from "./routes/dtfPrintStock.js";
import { finishedGoodsRouter } from "./routes/finishedGoods.js";
import { printRunsRouter } from "./routes/printRuns.js";
import { rawMaterialsRouter } from "./routes/rawMaterials.js";
import { screensRouter } from "./routes/screens.js";
import { shirtDesignsRouter } from "./routes/shirtDesigns.js";
import { uploadsRouter } from "./routes/uploads.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Explicit origin (not the wildcard default) is required for the browser to
// accept cookies on cross-origin responses — credentials:true + origin:"*"
// is rejected outright by the Fetch spec.
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Files here are UUID-named and never overwritten in place — a "change photo"
// always uploads a new file rather than mutating an existing one — so a
// year-long immutable cache is safe: a given URL's content can never change
// out from under a browser that already cached it.
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);

// Touches the DB, not just the web process — both Render's free web service
// and Neon's compute scale to zero after inactivity, and either one waking
// from cold is what causes the multi-second lag on the first request after
// a while. A scheduled ping here (see .github/workflows/keep-warm.yml) keeps
// both warm for free instead of paying for always-on compute.
app.get("/api/health", async (_req, res) => {
  await prisma.category.count();
  res.json({ status: "ok", service: "kaix-inventory-server" });
});

app.use("/api/auth", authRouter);

// Everything below is real shop data — login is required for all of it.
app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/raw-materials", requireAuth, rawMaterialsRouter);
app.use("/api/shirt-designs", requireAuth, shirtDesignsRouter);
app.use("/api/screens", requireAuth, screensRouter);
app.use("/api/finished-goods", requireAuth, finishedGoodsRouter);
app.use("/api/print-runs", requireAuth, printRunsRouter);
app.use("/api/dtf-print-orders", requireAuth, dtfPrintOrdersRouter);
app.use("/api/dtf-print-stock", requireAuth, dtfPrintStockRouter);
app.use("/api/uploads", requireAuth, uploadsRouter);
app.use("/api/ai", requireAuth, aiRouter);
app.use("/api/activity-log", requireAuth, activityLogRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
