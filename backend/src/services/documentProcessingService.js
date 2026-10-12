import fs from "node:fs/promises";

import { prisma } from "../lib/prisma.js";
import { extractDocumentText } from "./documentExtractionService.js";
import { chunkDocument } from "./documentChunkingService.js";

export async function processDocument({ documentId, userId }) {
  if (!documentId || !userId) {
    throw new Error("documentId and userId are required.");
  }

  // 1. Find the document belonging to this user.
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
    },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  // 2. Mark the document as processing.
  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: "PROCESSING",
      errorMessage: null,
    },
  });

  try {
    // 3. Extract text from the document.
    const pages = await extractDocumentText({
      filePath: document.storagePath,
      mimeType: document.mimeType,
    });

    const hasExtractableText = pages.some(
      (page) => page.text.trim().length > 0
    );

    if (!hasExtractableText) {
      throw new Error(
        "No extractable text found. The document may be scanned or empty."
      );
    }

    // 4. Generate chunks.
    const chunks = chunkDocument(pages);

    if (chunks.length === 0) {
      throw new Error("No chunks were generated.");
    }

    // 5. Replace existing chunks atomically.
    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: { documentId: document.id },
      });

      await tx.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId: document.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
        })),
      });

      await tx.document.update({
        where: { id: document.id },
        data: {
          status: "PROCESSED",
          errorMessage: null,
        },
      });
    });

    return {
      documentId: document.id,
      status: "PROCESSED",
      chunkCount: chunks.length,
    };
  } catch (error) {
    // 6. Mark processing as failed.
    try {
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });
    } catch (statusError) {
      console.error(
        "Could not update document failure status:",
        statusError.message
      );
    }

    throw error;
  }
}