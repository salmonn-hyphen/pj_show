import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../lib/profile-photo-upload.js";
import { getUserProfile, updateUserProfile, uploadProfilePhotoHandler, changePassword } from "../controllers/user.controller.js";

const router = Router();

router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.post("/change-password", authMiddleware, changePassword);
router.post("/profile/photo", authMiddleware, uploadProfilePhoto, uploadProfilePhotoHandler);

export default router;
