import { generateEmbedding } from "../services/embeddingService.js";

try {
  const text = "Employees are entitled to annual leave.";

  const embedding = await generateEmbedding(text);

  console.log("Embedding generated successfully.");
  console.log("Dimensions:", embedding.length);
  console.log("First five values:", embedding.slice(0, 5));
} catch (error) {
  console.error("Embedding test failed:", error.message);
  process.exitCode = 1;
}