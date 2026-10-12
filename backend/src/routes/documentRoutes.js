import { Router } from "express";
import { requireUser } from "../middlewares/authMiddleware.js";
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
} from "../controllers/documentController.js";
import {
  uploadDocument as uploadDocumentFile,
} from "../middlewares/uploadMiddleware.js";

const router = Router();

router.use(requireUser);

router.post(
  "/",
  uploadDocumentFile.single("file"),
  uploadDocument
);

router.get("/", getDocuments);

router.get("/:id", getDocumentById);

router.delete("/:id", deleteDocument);

export default router;