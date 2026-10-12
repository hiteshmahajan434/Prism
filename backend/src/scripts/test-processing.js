import "dotenv/config";

import { prisma } from "../lib/prisma.js";
import { processDocument } from "../services/documentProcessingService.js";

const documentId = process.argv[2];
const userId = process.argv[3];

if (!documentId || !userId) {
  console.error(
    'Usage: npx tsx src/scripts/test-processing.js "<document-id>" "<clerk-user-id>"'
  );
  process.exitCode = 1;
} else {
  try {
    const result = await processDocument({ documentId, userId });

    console.log("Document processing successful:");
    console.log(result);

    const savedChunks = await prisma.documentChunk.findMany({
      where: { documentId: result.documentId },
      orderBy: { chunkIndex: "asc" },
      select: {
        chunkIndex: true,
        pageNumber: true,
        content: true,
      },
    });

    console.log(`\nChunks saved in PostgreSQL: ${savedChunks.length}`);

    for (const chunk of savedChunks) {
      console.log("\n------------------------------");
      console.log(`Chunk index: ${chunk.chunkIndex}`);
      console.log(`Page number: ${chunk.pageNumber ?? "N/A"}`);
      console.log(`Content preview: ${chunk.content.slice(0, 150)}`);
    }
  } catch (error) {
    console.error("Document processing failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}