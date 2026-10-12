import { searchDocumentChunks } from "./semanticSearchService.js";
import { generateAnswer } from "./llmService.js";

export async function answerQuestion({
  question,
  userId,
  documentId,
}) {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A non-empty question is required.");
  }

  if (!userId) {
    throw new Error("userId is required.");
  }

  // 1. Retrieve relevant document chunks.
  const chunks = await searchDocumentChunks({
    query: question.trim(),
    userId,
    documentId,
    limit: 5,
  });

  // 2. Handle missing evidence.
  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find relevant information in your uploaded documents to answer this question.",
      citations: [],
    };
  }

  // 3. Prepare context and stable citation identifiers.
  const context = chunks
    .map(
      (chunk, index) => `
[S${index + 1}]
Document: ${chunk.filename}
Page: ${chunk.pageNumber ?? "N/A"}
Content:
${chunk.content}
`
    )
    .join("\n");

  // 4. Generate a grounded answer.
  const answer = await generateAnswer({
    question: question.trim(),
    context,
  });

  // 5. Return citations from retrieved database records.
  const citations = chunks.map((chunk, index) => ({
    id: `S${index + 1}`,
    documentId: chunk.documentId,
    filename: chunk.filename,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
  }));

  return {
    answer,
    citations,
  };
}