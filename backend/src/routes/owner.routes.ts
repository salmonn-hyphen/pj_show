import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getOwnerProfile,
  updateOwnerProfile,
  getOwnerDocuments,
  uploadOwnerDocument,
} from "../controllers/owner.controller.js";

const router = Router();

router.get("/profile", authMiddleware, getOwnerProfile);
router.put("/profile", authMiddleware, updateOwnerProfile);
router.get("/documents", authMiddleware, getOwnerDocuments);
router.post("/documents", authMiddleware, uploadOwnerDocument);

export default router;
