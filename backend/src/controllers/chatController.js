import { prisma } from "../lib/prisma.js";

// POST /api/chat/conversations
// Create a new conversation
export async function createConversation(req, res, next) {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/chat/conversations
// List conversations belonging to the authenticated user
export async function getConversations(req, res, next) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/chat/conversations/:id
// Retrieve a conversation and its messages
export async function getConversationById(req, res, next) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            role: true,
            content: true,
            citations: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/chat/conversations/:id
// Delete a conversation belonging to the authenticated user
export async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params;

    const result = await prisma.conversation.deleteMany({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}