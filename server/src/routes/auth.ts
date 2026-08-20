import { Router } from "express";
import { login, loginPin, logout, me } from "../controllers/authController.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth } from "../middleware/authMiddleware.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.post("/login-pin", asyncHandler(loginPin));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
