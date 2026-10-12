const DEFAULT_CHUNK_SIZE = 400;
const DEFAULT_CHUNK_OVERLAP = 60;

export function chunkDocument(pages, options = {}) {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OVERLAP;

  if (!Array.isArray(pages)) {
    throw new Error("pages must be an array.");
  }

  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("chunkSize must be a positive integer.");
  }

  if (
    !Number.isInteger(overlap) ||
    overlap < 0 ||
    overlap >= chunkSize
  ) {
    throw new Error("overlap must be between 0 and chunkSize - 1.");
  }

  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (typeof page.text !== "string") {
      continue;
    }

    const words = page.text.match(/\S+/g) ?? [];

    if (words.length === 0) {
      continue;
    }

    const step = chunkSize - overlap;

    for (let start = 0; start < words.length; start += step) {
      const end = Math.min(start + chunkSize, words.length);
      const content = words.slice(start, end).join(" ");

      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber ?? null,
        content,
      });

      if (end === words.length) {
        break;
      }
    }
  }

  return chunks;
}