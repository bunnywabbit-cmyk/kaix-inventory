import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { prisma } from "../lib/prisma.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT =
  "You are the Kaix Custom Operations & Sales AI. Answer concisely using precise figures from " +
  "the tool outputs. Format monetary values in PHP (₱). If data is missing, state what is " +
  "missing clearly — never estimate or invent a figure the tools didn't return. In particular, " +
  "profit margins are not available (finished goods have a sale price but no linked cost-of-goods), " +
  "so say so plainly if asked rather than guessing one.";

function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Paste your Anthropic API key into server/.env before using the AI assistant.",
    );
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic tool-use schema) — the model can only ever
// trigger one of these fixed, parameterized Prisma queries. There is no path
// from user text to raw SQL, which is what keeps this safe from injection.
// ---------------------------------------------------------------------------

const tools: Tool[] = [
  {
    name: "getSalesAnalytics",
    description:
      "Revenue and units sold for finished goods within a date range, including a breakdown by " +
      "design. Backed by the Sale log, which only has entries from the point this feature was " +
      "turned on — there is no sales history from before that. Profit margin is never included " +
      "because cost-of-goods isn't tracked per finished good.",
    input_schema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "ISO date (YYYY-MM-DD), inclusive start of the range.",
        },
        endDate: {
          type: "string",
          description: "ISO date (YYYY-MM-DD), inclusive end of the range.",
        },
        groupBy: {
          type: "string",
          enum: ["day", "week", "month"],
          description: "Optional time bucket for the revenue breakdown. Omit for a single total.",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "getInventoryStatus",
    description:
      "Current raw material stock (blank garments, ink, and other supplies) and finished-goods " +
      "on-hand counts. Use lowStockOnly to only see items at or below their reorder level.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category name filter (case-insensitive partial match), e.g. \"apparel\" or \"ink\".",
        },
        lowStockOnly: {
          type: "boolean",
          description: "If true, only return raw materials at or below their reorder level.",
        },
      },
    },
  },
  {
    name: "getScreenStatus",
    description:
      "Counts of physical screens by status (clean/reclaimed, coated, developed, exposed & ready, " +
      "on press, needing reclaim) and a breakdown by mesh count.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "getProductionQueue",
    description:
      "What's currently in production: planned print runs with their per-design line items and " +
      "completion status, plus how many screens are on press right now versus exposed and ready " +
      "to go to press. This app doesn't have named production stages like \"pre-press\" or " +
      "\"packing\" — this tool reports the real statuses the shop actually tracks instead.",
    input_schema: { type: "object", properties: {} },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

function parseDateBoundary(value: unknown, endOfDay: boolean): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(`${value.trim()}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bucketKey(date: Date, groupBy: string): string {
  const iso = date.toISOString();
  if (groupBy === "month") return iso.slice(0, 7); // YYYY-MM
  if (groupBy === "week") {
    // ISO week start (Monday) as a YYYY-MM-DD anchor date.
    const d = new Date(date);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return iso.slice(0, 10); // day
}

export async function getSalesAnalytics(input: Record<string, unknown>) {
  const startDate = parseDateBoundary(input.startDate, false);
  const endDate = parseDateBoundary(input.endDate, true);
  if (!startDate || !endDate) {
    return { error: "startDate and endDate must be valid YYYY-MM-DD dates." };
  }

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    orderBy: { createdAt: "asc" },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalPrice ?? 0), 0);
  const totalUnitsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const salesMissingPrice = sales.filter((sale) => sale.totalPrice === null).length;

  const byDesign = new Map<string, { unitsSold: number; revenue: number }>();
  for (const sale of sales) {
    const entry = byDesign.get(sale.designName) ?? { unitsSold: 0, revenue: 0 };
    entry.unitsSold += sale.quantity;
    entry.revenue += sale.totalPrice ?? 0;
    byDesign.set(sale.designName, entry);
  }
  const topDesigns = [...byDesign.entries()]
    .map(([designName, stats]) => ({ designName, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const groupBy = typeof input.groupBy === "string" ? input.groupBy : null;
  let breakdown: { period: string; revenue: number; unitsSold: number }[] | undefined;
  if (groupBy) {
    const byPeriod = new Map<string, { revenue: number; unitsSold: number }>();
    for (const sale of sales) {
      const key = bucketKey(sale.createdAt, groupBy);
      const entry = byPeriod.get(key) ?? { revenue: 0, unitsSold: 0 };
      entry.revenue += sale.totalPrice ?? 0;
      entry.unitsSold += sale.quantity;
      byPeriod.set(key, entry);
    }
    breakdown = [...byPeriod.entries()]
      .map(([period, stats]) => ({ period, ...stats }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  return {
    startDate: input.startDate,
    endDate: input.endDate,
    totalRevenue,
    totalUnitsSold,
    saleCount: sales.length,
    topDesigns,
    breakdown,
    profitMargin: null,
    notes: [
      "profitMargin is always null: finished goods have a sale price but no linked cost-of-goods, so margin can't be computed.",
      ...(salesMissingPrice > 0
        ? [`${salesMissingPrice} sale(s) in this range had no unit price set, so they're excluded from totalRevenue.`]
        : []),
    ],
  };
}

export async function getInventoryStatus(input: Record<string, unknown>) {
  const category = typeof input.category === "string" ? input.category.trim() : undefined;
  const lowStockOnly = input.lowStockOnly === true;

  const rawMaterials = await prisma.rawMaterial.findMany({
    where: category
      ? { category: { name: { contains: category, mode: "insensitive" } } }
      : undefined,
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const filtered = lowStockOnly
    ? rawMaterials.filter((item) => item.quantity <= item.reorderLevel)
    : rawMaterials;

  const finishedGoods = await prisma.finishedGood.findMany({ include: { design: true } });
  const finishedGoodsOnHand = finishedGoods.reduce((sum, item) => sum + item.quantityOnHand, 0);

  const byDesign = new Map<string, number>();
  for (const item of finishedGoods) {
    byDesign.set(item.design.designName, (byDesign.get(item.design.designName) ?? 0) + item.quantityOnHand);
  }
  const finishedGoodsByDesign = [...byDesign.entries()]
    .map(([designName, quantityOnHand]) => ({ designName, quantityOnHand }))
    .sort((a, b) => b.quantityOnHand - a.quantityOnHand);

  return {
    rawMaterials: filtered.map((item) => ({
      name: item.name,
      sku: item.sku,
      category: item.category.name,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      belowReorderLevel: item.quantity <= item.reorderLevel,
    })),
    lowStockCount: rawMaterials.filter((item) => item.quantity <= item.reorderLevel).length,
    finishedGoodsOnHand,
    finishedGoodsByDesign,
  };
}

export async function getScreenStatus() {
  const screens = await prisma.physicalScreen.findMany();

  const byStatus: Record<string, number> = {};
  const byMeshCount: Record<string, number> = {};
  for (const screen of screens) {
    byStatus[screen.status] = (byStatus[screen.status] ?? 0) + 1;
    const meshKey = String(screen.meshCount);
    byMeshCount[meshKey] = (byMeshCount[meshKey] ?? 0) + 1;
  }

  return {
    totalScreens: screens.length,
    byStatus,
    byMeshCount,
    needsReclaim: byStatus.NEEDS_RECLAIM ?? 0,
    readyForPress: byStatus.EXPOSED_READY ?? 0,
    onPress: byStatus.ON_PRESS ?? 0,
  };
}

export async function getProductionQueue() {
  const plannedRuns = await prisma.printRun.findMany({
    where: { status: "PLANNED" },
    include: {
      items: {
        include: { design: true, colorway: true, sizes: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const runs = plannedRuns.map((run) => ({
    printRunId: run.id,
    createdAt: run.createdAt,
    items: run.items.map((item) => ({
      designName: item.design.designName,
      colorwayOrColor: item.colorway?.colorwayName ?? item.color,
      garmentStyle: item.garmentStyle,
      done: item.done,
      totalQuantity: item.sizes.reduce((sum, size) => sum + size.quantity, 0),
      sizes: item.sizes.map((size) => ({ size: size.size, quantity: size.quantity })),
    })),
  }));

  const screenCounts = await getScreenStatus();

  return {
    note:
      "There are no named production stages (pre-press/packing/etc.) in this shop's system — " +
      "these are the real statuses it tracks: planned print runs (with each item's done/not-done " +
      "state) and screen press status.",
    plannedPrintRunCount: plannedRuns.length,
    plannedPrintRuns: runs,
    screensOnPress: screenCounts.onPress,
    screensReadyForPress: screenCounts.readyForPress,
    screensNeedingReclaim: screenCounts.needsReclaim,
  };
}

const toolImplementations: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
  getSalesAnalytics,
  getInventoryStatus,
  getScreenStatus: () => getScreenStatus(),
  getProductionQueue: () => getProductionQueue(),
};

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const impl = toolImplementations[name];
  if (!impl) return { error: `Unknown tool: ${name}` };
  try {
    return await impl(input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed." };
  }
}

// ---------------------------------------------------------------------------
// Chat orchestration
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: unknown }[];
}

export async function runChat(message: string, conversationHistory: ChatMessage[]): Promise<ChatResult> {
  const client = anthropicClient();

  const messages: MessageParam[] = [
    ...conversationHistory.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: "user" as const, content: message },
  ];

  const toolCalls: ChatResult["toolCalls"] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n\n");
      return { reply: reply || "I didn't get a response for that — try rephrasing.", toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const input = (block.input ?? {}) as Record<string, unknown>;
      const result = await executeTool(block.name, input);
      toolCalls.push({ name: block.name, input, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "That question needed more tool calls than I'm allowed to make at once — try narrowing it down.",
    toolCalls,
  };
}
