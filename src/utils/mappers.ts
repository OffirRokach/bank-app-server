import { AccountResponse, UserProfile, User } from "../types";
import { Decimal } from "decimal.js";

/**
 * Maps an account from the database to an AccountResponse object for API responses
 */
export const toAccountResponse = (account: any): AccountResponse => ({
  id: account.id,
  accountNumber: account.accountNumber,
  isDefault: account.defaultAccount,
  balance: new Decimal(account.balance).toNumber(),
});

/**
 * Maps an array of accounts to AccountResponse objects
 */
export const toAccountResponses = (accounts: any[]): AccountResponse[] => {
  return accounts.map(toAccountResponse);
};

export const mapUserToProfile = (user: User): UserProfile => {
  const {
    id,
    email,
    firstName,
    lastName,
    phoneNumber,
    birthDate,
    createdAt,
    lastLoginAt,
  } = user;
  return {
    id,
    email,
    firstName,
    lastName,
    phoneNumber,
    birthDate,
    createdAt,
    lastLoginAt,
  };
};
