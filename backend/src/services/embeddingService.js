const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

export async function generateEmbedding(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Text must be a non-empty string.");
  }

  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Ollama embedding request failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  const embedding = data.embeddings?.[0];

  if (!Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error(
      `Expected a 768-dimensional embedding, received ${
        embedding?.length ?? 0
      } dimensions.`
    );
  }

  return embedding;
}