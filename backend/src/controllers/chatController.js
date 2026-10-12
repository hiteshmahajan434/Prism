import { prisma } from "../lib/prisma.js";
import { answerQuestion } from "../services/ragService.js";

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

// POST /api/chat/conversations/:id/messages
// Send a message and generate a RAG answer
export async function sendMessage(req, res, next) {
    try {
        const { id: conversationId } = req.params;
        const { question, documentId } = req.body;

        // 1. Validate the question
        if (typeof question !== "string" || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "A non-empty question is required.",
            });
        }

        if (question.trim().length > 4000) {
            return res.status(400).json({
                success: false,
                message: "Question cannot exceed 4000 characters.",
            });
        }

        if (
            documentId !== undefined &&
            (typeof documentId !== "string" || !documentId.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "documentId must be a non-empty string.",
            });
        }

        // 2. Verify conversation ownership
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                userId: req.userId,
            },
            select: {
                id: true,
                title: true,
            },
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found.",
            });
        }

        // 3. If a document was selected, verify ownership and processing status
        if (documentId) {
            const document = await prisma.document.findFirst({
                where: {
                    id: documentId,
                    userId: req.userId,
                    status: "PROCESSED",
                },
                select: {
                    id: true,
                },
            });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Processed document not found.",
                });
            }
        }

        const trimmedQuestion = question.trim();

        // 4. Save the user's message
        const userMessage = await prisma.$transaction(async (tx) => {
            const message = await tx.message.create({
                data: {
                    conversationId,
                    role: "USER",
                    content: trimmedQuestion,
                },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            });

            // Update conversation activity time
            // and set its title from the first question.
            const messageCount = await tx.message.count({
                where: { conversationId },
            });

            await tx.conversation.update({
                where: { id: conversationId },
                data: {
                    ...(messageCount === 1
                        ? {
                            title:
                                trimmedQuestion.length > 60
                                    ? `${trimmedQuestion.slice(0, 57)}...`
                                    : trimmedQuestion,
                        }
                        : {}),
                },
            });

            return message;
        });

        // 5. Generate the RAG answer
        let result;

        try {
            result = await answerQuestion({
                question: trimmedQuestion,
                userId: req.userId,
                documentId,
            });
        } catch (error) {
            console.error("RAG answer generation failed:", error.message);

            return res.status(502).json({
                success: false,
                message:
                    "Your question was saved, but Prism could not generate an answer. Please try again.",
                data: {
                    userMessage,
                },
            });
        }

        // 6. Save the assistant's response and citations
        const assistantMessage = await prisma.$transaction(async (tx) => {
            const message = await tx.message.create({
                data: {
                    conversationId,
                    role: "ASSISTANT",
                    content: result.answer,
                    citations: result.citations,
                },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    citations: true,
                    createdAt: true,
                },
            });

            await tx.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            });

            return message;
        });

        // 7. Return the completed answer
        return res.status(200).json({
            success: true,
            data: {
                userMessage,
                assistantMessage,
            },
        });
    } catch (error) {
        next(error);
    }
}