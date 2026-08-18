import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../lib/profile-photo-upload.js";
import { getUserProfile, uploadProfilePhotoHandler } from "../controllers/user.controller.js";

const router = Router();

router.get("/profile", authMiddleware, getUserProfile);
router.post("/profile/photo", authMiddleware, uploadProfilePhoto, uploadProfilePhotoHandler);

export default router;
