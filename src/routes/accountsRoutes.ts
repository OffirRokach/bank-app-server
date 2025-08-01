import { Router } from "express";
import {
  getAllAccounts,
  getAccountById,
  updateAccount,
  createAnotherAccount,
} from "../controllers/accountsController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

// GET /api/v1/accounts - list all accounts for the current user
router.get("/", getAllAccounts);

// POST /api/v1/accounts - create a new additional account (max 3 per user)
router.post("/", createAnotherAccount);

// GET /api/v1/accounts/:id - get specific account details
router.get("/:id", getAccountById);

// PUT /api/v1/accounts/:id - update account to  default account.
router.put("/:id", updateAccount);

export default router;
