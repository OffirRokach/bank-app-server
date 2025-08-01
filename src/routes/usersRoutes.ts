import { Router } from "express";
import { getUserById, updateUser } from "../controllers/userController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

// Protect all routes with auth middleware
router.use(authenticate);

// GET /api/v1/users/:id - Get user profile details
router.get("/:id", getUserById);

// PUT /api/v1/users/:id - Update user profile
router.put("/:id", updateUser);

export default router;
