import { Router } from "express";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  registerRequestSchema,
  registerVerifySchema,
} from "../lib/validation-schemas.js";
import {
  getEmailByPhoneController,
  login,
  logout,
  refresh,
  registerRequest,
  registerVerify,
  session,
} from "../controllers/auth.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

router.post("/register-request", authLimiter, validate(registerRequestSchema), registerRequest);
router.post("/register-verify", authLimiter, validate(registerVerifySchema), registerVerify);
router.get("/get-email-by-phone", authLimiter, getEmailByPhoneController);

router.post("/auth/login", authLimiter, validate(loginSchema), login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", logout);
router.get("/auth/session", authMiddleware, session);

router.all("/auth/*splat", toNodeHandler(auth));

export default router;
