import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { runChat } from "../services/AIChatService.js";
import { chatRequestSchema } from "../validators/aiChat.js";

export const aiRouter = Router();

aiRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const { message, conversationHistory } = chatRequestSchema.parse(req.body);
    const result = await runChat(message, conversationHistory);
    res.json(result);
  }),
);
