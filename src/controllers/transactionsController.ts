import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatusCodes";
import { TRANSACTIONS_LIMIT } from "../constants/constants";
import {
  getAccountTransactions,
  findAccountByIdAndUser,
  findAccountByNumber,
  transferFunds as executeTransfer,
} from "../repositories/transactionRepository";
import { Decimal } from "decimal.js";
import { JwtPayload } from "../types";
import { notifyMoneyTransfer, isUserConnected } from "../middleware/socketMiddleware";
import { io } from "../server";

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Get transactions for a specific account
 * @route GET /api/v1/transactions?accountId=abc123
 */
export const getTransactions = async (
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
    const { accountId } = req.query;

    if (!accountId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Missing accountId in query",
      });
    }

    const account = await findAccountByIdAndUser(accountId as string, userId);

    if (!account) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Account not found or not owned",
      });
    }

    // Get transactions for the specified account with signed amounts
    const transactions = await getAccountTransactions(
      account.id,
      TRANSACTIONS_LIMIT
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: {
        accountId: account.id,
        accountNumber: account.accountNumber,
        defaultAccount: account.defaultAccount,
        transactions,
      },
    });
  } catch (error) {
    console.error("Error in getTransactions:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while retrieving transactions",
    });
  }
};

/**
 * Transfer funds between accounts
 * @route POST /api/v1/transactions
 */
export const transferFunds = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { accountId, recipientAccountNumber, amount, description } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate required fields
    if (!accountId || !recipientAccountNumber || amount === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message:
          "Missing required fields: accountId, recipientAccountNumber, amount",
      });
    }

    const validateUserAccount = await findAccountByIdAndUser(
      accountId,
      req.user.userId
    );

    if (!validateUserAccount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Source account not found or unauthorized",
      });
    }

    if (validateUserAccount.accountNumber === recipientAccountNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Source and recipient accounts cannot be the same",
      });
    }

    // Validate amount value
    let amountDecimal;
    try {
      amountDecimal = new Decimal(amount);
      if (amountDecimal.isNegative() || amountDecimal.isZero()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Amount must be a positive number",
        });
      }
    } catch (error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid amount format",
      });
    }

    const userId = req.user.userId;

    // Find the source account owned by the user
    const fromAccount = await findAccountByIdAndUser(accountId, userId);
    if (!fromAccount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Source account not found or unauthorized",
      });
    }

    // Check sufficient funds
    const balanceDecimal = new Decimal(fromAccount.balance.toString());

    if (balanceDecimal.lessThan(amountDecimal)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Insufficient funds",
      });
    }

    // Find the destination account by recipient account number
    const toAccount = await findAccountByNumber(recipientAccountNumber);
    if (!toAccount) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Recipient account not found",
      });
    }

    // Execute the transfer
    const { transaction } = await executeTransfer(
      fromAccount.id,
      toAccount.id,
      amountDecimal,
      description
    );

    // Send real-time notification if recipient is online
    try {
      // Extract sender and recipient information from the transaction
      const senderUser = {
        id: transaction.fromAccount.user.id,
        firstName: transaction.fromAccount.user.firstName,
        lastName: transaction.fromAccount.user.lastName
      };

      const recipientUser = {
        id: transaction.toAccount.user.id,
        firstName: transaction.toAccount.user.firstName,
        lastName: transaction.toAccount.user.lastName
      };

      // Only send notification if recipient is online
      // The function will not fail if recipient is offline
      notifyMoneyTransfer(
        io,
        {
          amount: amountDecimal.toNumber(),
          createdAt: new Date()
        },
        senderUser,
        recipientUser
      );
    } catch (notificationError) {
      // Log notification error but don't fail the transaction
      console.error("Error sending money transfer notification:", notificationError);
      // Transaction still succeeded, so we continue
    }

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Transfer completed successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error in transferFunds:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while processing the transfer",
    });
  }
};
