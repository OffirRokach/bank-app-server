import prisma from "../services/databaseService";
import { Account } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { Decimal } from "decimal.js";
import { TransferResult, TransactionWithAccounts } from "../types";

/**
 * Get transactions for a specific account with pagination
 * @param accountId - The ID of the account to get transactions for
 * @param limit - Maximum number of transactions to return
 * @param offset - Number of transactions to skip (for pagination)
 * @returns Array of transactions where the account is either sender or receiver, with signed amounts
 */
export const getAccountTransactions = async (
  accountId: string,
  limit: number = 10,
  offset: number = 0
): Promise<TransactionWithAccounts[]> => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      },
      include: {
        fromAccount: {
          select: {
            accountNumber: true,
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        toAccount: {
          select: {
            accountNumber: true,
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions for account:", error);
    throw error;
  }
};

/**
 * Find account by ID and verify ownership
 * @param accountId - The account ID to find
 * @param userId - The user ID who should own the account
 * @returns The account if found and owned by the user, null otherwise
 */
export const findAccountByIdAndUser = async (
  accountId: string,
  userId: string
): Promise<Account | null> => {
  try {
    return await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });
  } catch (error) {
    console.error("Error finding account by ID and user:", error);
    throw error;
  }
};

/**
 * Find account by account number
 * @param accountNumber - The account number to find
 * @returns The account if found, null otherwise
 */
export const findAccountByNumber = async (
  accountNumber: string
): Promise<Account | null> => {
  try {
    return await prisma.account.findUnique({
      where: {
        accountNumber,
      },
    });
  } catch (error) {
    console.error("Error finding account by number:", error);
    throw error;
  }
};

/**
 * Transfer funds between accounts
 * @param fromAccountId - Source account ID
 * @param toAccountId - Destination account ID
 * @param amount - Amount to transfer
 * @param description - Optional transaction description
 * @returns The created transaction with account information
 */
export const transferFunds = async (
  fromAccountId: string,
  toAccountId: string,
  amount: Decimal,
  description?: string
): Promise<TransferResult> => {
  try {
    // Generate a unique transaction reference
    const transactionReference = `TRX-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // Perform the transaction in a transaction to ensure atomicity
    const transaction = await prisma.$transaction(async (prismaClient) => {
      // Update source account balance
      await prismaClient.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount.toString() } },
      });

      // Update destination account balance
      await prismaClient.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount.toString() } },
      });

      // Create transaction record
      return prismaClient.transaction.create({
        data: {
          id: uuidv4(),
          transactionReference,
          fromAccountId,
          toAccountId,
          amount: amount.toString(),
          description,
        },
        include: {
          fromAccount: {
            select: {
              accountNumber: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
          },
          toAccount: {
            select: {
              accountNumber: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            },
          },
        },
      });
    });

    // Return the transaction with the correct type
    return { transaction } as TransferResult;
  } catch (error) {
    console.error("Error transferring funds:", error);
    throw error;
  }
};
