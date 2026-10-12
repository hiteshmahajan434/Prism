import "dotenv/config";

import { prisma } from "../lib/prisma.js";
import { answerQuestion } from "../services/ragService.js";

const userId = process.argv[2];
const question = process.argv[3];
const documentId = process.argv[4] || undefined;

if (!userId || !question) {
  console.error(
    'Usage: npx tsx src/scripts/test-rag.js "<clerk-user-id>" "<question>" ["<document-id>"]'
  );
  process.exitCode = 1;
} else {
  try {
    const result = await answerQuestion({
      question,
      userId,
      documentId,
    });

    console.log("\nQuestion:");
    console.log(question);

    console.log("\nAnswer:");
    console.log(result.answer);

    console.log("\nCitations:");
    console.log(JSON.stringify(result.citations, null, 2));
  } catch (error) {
    console.error("RAG test failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}