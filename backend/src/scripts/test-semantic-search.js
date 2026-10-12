import "dotenv/config";

import { prisma } from "../lib/prisma.js";
import { searchDocumentChunks } from "../services/semanticSearchService.js";

const userId = process.argv[2];
const query = process.argv[3];
const documentId = process.argv[4] || undefined;

if (!userId || !query) {
  console.error(
    'Usage: npx tsx src/scripts/test-semantic-search.js "<clerk-user-id>" "<question>" ["<document-id>"]'
  );
  process.exitCode = 1;
} else {
  try {
    const results = await searchDocumentChunks({
      query,
      userId,
      documentId,
      limit: 5,
    });

    console.log(`\nSearch query: ${query}`);
    console.log(`Results found: ${results.length}`);

    for (const [index, result] of results.entries()) {
      console.log("\n------------------------------");
      console.log(`Rank: ${index + 1}`);
      console.log(`Filename: ${result.filename}`);
      console.log(`Chunk index: ${result.chunkIndex}`);
      console.log(`Page: ${result.pageNumber ?? "N/A"}`);
      console.log(`Distance: ${result.distance.toFixed(4)}`);
      console.log(`Similarity: ${result.similarity.toFixed(4)}`);
      console.log(`Content: ${result.content.slice(0, 300)}`);
    }
  } catch (error) {
    console.error("Semantic search failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}