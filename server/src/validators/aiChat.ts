import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  conversationHistory: z.array(chatMessageSchema).default([]),
});
