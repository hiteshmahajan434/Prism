import { Router } from "express";

import { requireUser } from "../middlewares/authMiddleware.js";

import {
  createConversation,
  getConversations,
  getConversationById,
  deleteConversation,
} from "../controllers/chatController.js";

const router = Router();

// All chat routes require authentication
router.use(requireUser);

router.post("/conversations", createConversation);

router.get("/conversations", getConversations);

router.get("/conversations/:id", getConversationById);

router.delete("/conversations/:id", deleteConversation);

export default router;