import { prisma } from "../lib/prisma.js";
import { generateEmbedding } from "./embeddingService.js";

export async function searchDocumentChunks({
  query,
  userId,
  documentId,
  limit = 5,
}) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("A non-empty search query is required.");
  }

  if (!userId) {
    throw new Error("userId is required.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("limit must be an integer between 1 and 20.");
  }

  // Generate an embedding for the user's question.
  const embedding = await generateEmbedding(query.trim());
  const vectorLiteral = `[${embedding.join(",")}]`;

  // Search only processed documents belonging to this user.
  // Optionally restrict the search to one document.
  const results = await prisma.$queryRaw`
    SELECT
      dc.id AS "chunkId",
      dc."documentId" AS "documentId",
      d.filename AS "filename",
      dc."chunkIndex" AS "chunkIndex",
      dc."pageNumber" AS "pageNumber",
      dc.content AS "content",
      (dc.embedding <=> ${vectorLiteral}::vector) AS "distance"
    FROM "DocumentChunk" dc
    INNER JOIN "Document" d
      ON d.id = dc."documentId"
    WHERE d."userId" = ${userId}
      AND d.status = 'PROCESSED'
      AND dc.embedding IS NOT NULL
      AND (${documentId ?? null}::text IS NULL OR d.id = ${documentId ?? null})
    ORDER BY dc.embedding <=> ${vectorLiteral}::vector ASC
    LIMIT ${limit}
  `;

  return results.map((row) => ({
    chunkId: row.chunkId,
    documentId: row.documentId,
    filename: row.filename,
    chunkIndex: row.chunkIndex,
    pageNumber: row.pageNumber,
    content: row.content,
    distance: Number(row.distance),
    similarity: 1 - Number(row.distance),
  }));
}