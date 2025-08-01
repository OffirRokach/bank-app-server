import { Router } from "express";
import {
  getTransactions,
  transferFunds,
} from "../controllers/transactionsController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

// Protect all routes with auth middleware
router.use(authenticate);

// GET /api/v1/transactions?accountId=abc123
router.get("/", getTransactions);

// POST /api/v1/transactions - for transfers
router.post("/", transferFunds);

export default router;
