import { prisma } from "../lib/prisma.js";
import { generateEmbedding } from "./embeddingService.js";

export async function generateAndStoreDocumentEmbeddings({
  documentId,
  userId,
}) {
  if (!documentId || !userId) {
    throw new Error("documentId and userId are required.");
  }

  // Verify that the document belongs to this user.
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
      status: "PROCESSED",
    },
    select: {
      id: true,
    },
  });

  if (!document) {
    throw new Error(
      "Processed document not found or user does not own the document."
    );
  }

  // Retrieve chunks in their original order.
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    select: {
      id: true,
      content: true,
      chunkIndex: true,
    },
  });

  if (chunks.length === 0) {
    throw new Error("No chunks found for this document.");
  }

  let processedCount = 0;

  // Process sequentially to limit memory usage.
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);

    // pgvector accepts a vector literal such as '[0.1,0.2,...]'.
    const vectorLiteral = `[${embedding.join(",")}]`;

    // Prisma parameterizes the vector value; no SQL string interpolation
    // is used for user-provided content or identifiers.
    await prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET "embedding" = ${vectorLiteral}::vector
      WHERE "id" = ${chunk.id}
        AND "documentId" = ${document.id}
    `;

    processedCount++;

    console.log(
      `Embedded chunk ${chunk.chunkIndex + 1}/${chunks.length}`
    );
  }

  // Confirm every chunk now has an embedding.
  const result = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT("embedding")::int AS embedded
    FROM "DocumentChunk"
    WHERE "documentId" = ${document.id}
  `;

  const { total, embedded } = result[0];

  if (total !== embedded) {
    throw new Error(
      `Embedding verification failed: ${embedded}/${total} chunks embedded.`
    );
  }

  return {
    documentId: document.id,
    totalChunks: total,
    embeddedChunks: embedded,
    processedCount,
  };
}