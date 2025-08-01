import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  login,
  logout,
  signup,
  verifyAccount,
} from "../controllers/authController";

const router = Router();

// Public routes
router.post("/signup", signup);
router.get("/verify-account", verifyAccount);
router.post("/login", login);

// Protected routes
router.use(authenticate);
router.post("/logout", logout);

export default router;
