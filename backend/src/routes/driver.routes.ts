import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";
import { updateProfile } from "../controllers/driver.controller.js";
import { getKyc, uploadKyc } from "../controllers/driver-kyc.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(__dirname, "../../uploads/kyc"));
  },
  filename: (_req, file, cb) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${uniqueId}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const kycFields = upload.fields([
  { name: "nrcFront", maxCount: 1 },
  { name: "nrcBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "drivingLicenseFront", maxCount: 1 },
  { name: "drivingLicenseBack", maxCount: 1 },
]);

const router = Router();

router.put("/profile", authMiddleware, updateProfile);
router.get("/kyc", authMiddleware, getKyc);
router.post("/kyc/upload", authMiddleware, kycFields, uploadKyc);

export default router;
