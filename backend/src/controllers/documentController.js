import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";

export async function uploadDocument(req, res, next) {
  let savedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF or DOCX file.",
      });
    }

    savedFilePath = req.file.path;

    const document = await prisma.document.create({
      data: {
        userId: req.userId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: req.file.path,
        status: "UPLOADED",
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document,
    });
  } catch (error) {
    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => {});
    }

    next(error);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const documents = await prisma.document.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentById(req, res, next) {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const document = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    await prisma.document.delete({
      where: {
        id: document.id,
      },
    });

    await fs.unlink(document.storagePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error("Failed to remove stored document:", error);
      }
    });

    res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}