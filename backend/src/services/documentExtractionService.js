import fs from "node:fs/promises";
import path from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

/**
 * Extract text from a PDF, preserving page numbers.
 */
async function extractPdfText(filePath) {
    const fileBuffer = await fs.readFile(filePath);

    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileBuffer),
        useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pages = [];

    try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();

            const text = textContent.items
                .filter((item) => "str" in item)
                .map((item) => item.str)
                .join(" ")
                .trim();

            pages.push({
                pageNumber,
                text,
            });

            page.cleanup();
        }

        return pages;
    } finally {
        await loadingTask.destroy();
    }
}

/**
 * Extract text from a DOCX document.
 */
async function extractDocxText(filePath) {
    const result = await mammoth.extractRawText({
        path: filePath,
    });

    const text = result.value.trim();

    return [
        {
            pageNumber: null,
            text,
        },
    ];
}

/**
 * Extract text based on the file MIME type.
 */
export async function extractDocumentText({ filePath, mimeType }) {
    if (!filePath || !mimeType) {
        throw new Error("filePath and mimeType are required.");
    }

    if (mimeType === "application/pdf") {
        return extractPdfText(filePath);
    }

    if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        return extractDocxText(filePath);
    }

    throw new Error(`Unsupported document type: ${mimeType}`);
}