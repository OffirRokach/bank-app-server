import { PrismaClient } from "@prisma/client";
import { AccountResponse } from "../types";
import { toAccountResponse, toAccountResponses } from "../utils/mappers";
import { generateAccountNumber } from "../utils/accountUtils";
import { v4 as uuidv4 } from "uuid";
import {
  MAX_ACCOUNTS_PER_USER,
  DEFAULT_ADDITIONAL_ACCOUNT_BALANCE,
} from "../constants/constants";

const prisma = new PrismaClient();

/**
 * Get all accounts for a specific user
 * @param userId - The ID of the user to get accounts for
 * @returns Array of user accounts with formatted data
 */
export const getAccountsByUserId = async (
  userId: string
): Promise<AccountResponse[]> => {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        userId,
      },
    });

    return toAccountResponses(accounts);
  } catch (error) {
    console.error("Error fetching accounts by user ID:", error);
    throw error;
  }
};

/**
 * Get the default account for a user
 * @param userId - The ID of the user
 * @returns The default account or null if none exists
 */
export const getDefaultAccountByUserId = async (
  userId: string
): Promise<AccountResponse | null> => {
  try {
    const defaultAccount = await prisma.account.findFirst({
      where: {
        userId,
        defaultAccount: true,
      },
    });

    if (!defaultAccount) {
      return null;
    }

    return toAccountResponse(defaultAccount);
  } catch (error) {
    console.error("Error fetching default account:", error);
    throw error;
  }
};

/**
 * Get account by ID
 * @param accountId - The ID of the account to retrieve
 * @param userId - The ID of the user who owns the account (for authorization)
 * @returns The account if found and owned by the user, null otherwise
 */
export const getAccountById = async (
  accountId: string,
  userId: string
): Promise<AccountResponse | null> => {
  try {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId, // Ensure the account belongs to the user
      },
    });

    if (!account) {
      return null;
    }

    return toAccountResponse(account);
  } catch (error) {
    console.error("Error fetching account by ID:", error);
    throw error;
  }
};

/**
 * Get account by email
 * @param email - The email of the account to retrieve
 * @returns The account if found, null otherwise
 */
export const getAccountByNumber = async (
  accountNumber: string
): Promise<AccountResponse | null> => {
  try {
    const account = await prisma.account.findUnique({
      where: {
        accountNumber,
      },
    });

    if (!account) {
      return null;
    }

    return toAccountResponse(account);
  } catch (error) {
    console.error("Error fetching account by number:", error);
    throw error;
  }
};

/**
 * Set an account as the default account for a user
 * This will also unset any existing default account
 * @param accountId - The ID of the account to set as default
 * @param userId - The ID of the user who owns the account
 * @returns The updated account if successful, null otherwise
 */
export const setAccountAsDefault = async (
  accountId: string,
  userId: string
): Promise<AccountResponse | null> => {
  try {
    // First, verify the account exists and belongs to the user
    const accountExists = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!accountExists) {
      return null;
    }

    // Use a transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // 1. Unset any existing default account for this user
      await tx.account.updateMany({
        where: {
          userId,
          defaultAccount: true,
        },
        data: {
          defaultAccount: false,
        },
      });

      // 2. Set the specified account as default
      const updatedAccount = await tx.account.update({
        where: {
          id: accountId,
        },
        data: {
          defaultAccount: true,
        },
      });

      return toAccountResponse(updatedAccount);
    });
  } catch (error) {
    console.error("Error setting account as default:", error);
    throw error;
  }
};

/**
 * Create a new additional account for a user
 * Enforces a limit of 3 accounts per user
 * @param userId - The ID of the user to create an account for
 * @returns The newly created account or null if the limit is reached
 */
export const createAdditionalAccount = async (
  userId: string
): Promise<AccountResponse | null> => {
  try {
    // Check if the user has reached the maximum number of accounts
    const accountCount = await prisma.account.count({
      where: { userId },
    });

    if (accountCount >= MAX_ACCOUNTS_PER_USER) {
      return null; // User has reached the account limit
    }

    // Create a new account with a balance of 500
    const newAccount = await prisma.account.create({
      data: {
        id: uuidv4(),
        accountNumber: generateAccountNumber(),
        defaultAccount: false,
        balance: DEFAULT_ADDITIONAL_ACCOUNT_BALANCE,
        userId,
      },
    });

    return toAccountResponse(newAccount);
  } catch (error) {
    console.error("Error creating additional account:", error);
    throw error;
  }
};
