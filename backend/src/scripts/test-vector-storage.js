import "dotenv/config";

import { prisma } from "../lib/prisma.js";
import { generateAndStoreDocumentEmbeddings } from "../services/vectorStorageService.js";

const documentId = process.argv[2];
const userId = process.argv[3];

if (!documentId || !userId) {
  console.error(
    'Usage: npx tsx src/scripts/test-vector-storage.js "<document-id>" "<clerk-user-id>"'
  );
  process.exitCode = 1;
} else {
  try {
    const result = await generateAndStoreDocumentEmbeddings({
      documentId,
      userId,
    });

    console.log("\nEmbedding storage successful:");
    console.log(result);
  } catch (error) {
    console.error("Embedding storage failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}