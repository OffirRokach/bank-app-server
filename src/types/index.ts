// Common types for the application
import { Transaction } from "@prisma/client";

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: Date;
  status: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  isDefault: boolean;
  balance: number;
  createdAt: Date;
}

export interface AccountResponse {
  id: string;
  accountNumber: string;
  isDefault: boolean;
  balance: number;
}

export type AccessToken = string;
export interface JwtPayload {
  userId: string;
  email: string;
  firstName: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  authToken: AccessToken;
  defaultAccount: AccountResponse | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: Date;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export type UserUpdatableFields = Partial<
  Omit<User, "id" | "createdAt" | "lastLoginAt" | "status" | "birthDate">
>;

// Type for user data submitted during signup (excluding system fields and password)
export interface SignupResponse {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: string;
}

export type TransferResult = {
  transaction: Transaction & {
    fromAccount: { 
      accountNumber: string;
      userId: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
    toAccount: { 
      accountNumber: string;
      userId: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  };
};

export type TransactionWithAccounts = Transaction & {
  fromAccount: { 
    accountNumber: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  toAccount: { 
    accountNumber: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
};

export interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}
