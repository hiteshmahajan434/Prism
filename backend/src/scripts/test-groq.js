import "dotenv/config";

import { generateAnswer } from "../services/llmService.js";

try {
  const answer = await generateAnswer({
    question: "What degree is mentioned in the document?",
    context:
      "The document states: Bachelor of Technology in Electronics and Telecommunication.",
  });

  console.log("Groq test successful.");
  console.log("\nGenerated answer:\n");
  console.log(answer);
} catch (error) {
  console.error("Groq test failed:", error.message);
  process.exitCode = 1;
}