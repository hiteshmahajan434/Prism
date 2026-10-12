import { Router } from "express";

import { requireUser } from "../middlewares/authMiddleware.js";

import {
  createConversation,
  getConversations,
  getConversationById,
  deleteConversation,
  sendMessage
} from "../controllers/chatController.js";

const router = Router();

// All chat routes require authentication
router.use(requireUser);

router.post("/conversations", createConversation);

router.get("/conversations", getConversations);

router.get("/conversations/:id", getConversationById);

router.delete("/conversations/:id", deleteConversation);

router.post("/conversations/:id/messages", sendMessage);

export default router;