import { Request, Response } from "express";
import { JwtPayload } from "../types";
import {
  getAccountsByUserId,
  getAccountById as fetchAccountById,
  setAccountAsDefault,
  createAdditionalAccount,
} from "../repositories/accountRepository";
import { MAX_ACCOUNTS_PER_USER } from "../constants/constants";
import { HTTP_STATUS } from "../constants/httpStatusCodes";

// Define interface to extend Express Request
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Get all accounts for the authenticated user
 * @route GET /api/v1/accounts
 */
export const getAllAccounts = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;
    const accounts = await getAccountsByUserId(userId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Accounts retrieved successfully",
      data: accounts,
    });
  } catch (error) {
    console.error("Error in getAllAccounts:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while retrieving accounts",
    });
  }
};

/**
 * Get account by ID for the authenticated user
 * @route GET /api/v1/accounts/:id
 */
export const getAccountById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;
    const accountId = req.params.id;

    const account = await fetchAccountById(accountId, userId);

    if (!account) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Account retrieved successfully",
      data: account,
    });
  } catch (error) {
    console.error("Error in getAccountById:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while retrieving the account",
    });
  }
};

/**
 * Update account (set as default) for the authenticated user
 * This will automatically unset any existing default account
 * @route PATCH /api/v1/accounts/:id
 */
export const updateAccount = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;
    const accountId = req.params.id;

    const updatedAccount = await setAccountAsDefault(accountId, userId);

    if (!updatedAccount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Account set as default successfully",
      data: updatedAccount,
    });
  } catch (error) {
    console.error("Error in updateAccount:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while updating the account",
    });
  }
};

/**
 * Create another account for the authenticated user
 * Enforces a limit of 3 accounts per user
 * @route POST /api/v1/accounts
 */
export const createAnotherAccount = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    // Check if there's any unexpected data in the request body
    if (Object.keys(req.body).length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message:
          "Request body should be empty. No additional data is required.",
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;

    // Create a new account with the repository function
    const newAccount = await createAdditionalAccount(userId);

    // If null is returned, the user has reached their account limit
    if (!newAccount) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: `Account limit reached. You cannot create more than ${MAX_ACCOUNTS_PER_USER} accounts.`,
      });
    }

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "New account created successfully",
      data: newAccount,
    });
  } catch (error) {
    console.error("Error in createAnotherAccount:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while creating the account",
    });
  }
};
