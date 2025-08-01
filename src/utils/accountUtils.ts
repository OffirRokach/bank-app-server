/**
 * Utility functions for account operations
 */
import { ACCOUNT_NUMBER_MIN, ACCOUNT_NUMBER_MAX } from "../constants/constants";

/**
 * Generate a random 10-digit account number
 * @returns A random account number
 */
export const generateAccountNumber = (): string => {
  // Generate a random 10-digit number
  return Math.floor(
    ACCOUNT_NUMBER_MIN +
      Math.random() * (ACCOUNT_NUMBER_MAX - ACCOUNT_NUMBER_MIN)
  ).toString();
};
