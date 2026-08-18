import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listAgreements,
  getAgreement,
  agreeToAgreement,
} from "../controllers/agreements.controller.js";

const router = Router();

router.get("/", authMiddleware, listAgreements);
router.get("/:id", authMiddleware, getAgreement);
router.post("/:id/agree", authMiddleware, agreeToAgreement);

export default router;
