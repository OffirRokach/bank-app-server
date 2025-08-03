import { Decimal } from "decimal.js";

/**
 * Constants related to account and authentication settings
 */

// Account limits and balances
/**
 * Maximum number of accounts a user can have
 */
export const MAX_ACCOUNTS_PER_USER = 3;

/**
 * Default initial balance for new additional accounts
 */
export const DEFAULT_ADDITIONAL_ACCOUNT_BALANCE = new Decimal(500);

/**
 * Default initial balance for first account (created on verification)
 */
export const DEFAULT_FIRST_ACCOUNT_BALANCE = new Decimal(1000);

// Authentication and security
/**
 * JWT tokens expiration time
 */
export const VERIFICATION_TOKEN_EXPIRES_IN = "24h";
export const ACCESS_TOKEN_EXPIRES_IN = "15m";

/**
 * Minimum password length for user registration
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Minimum required field length for required string fields
 */
export const MIN_REQUIRED_FIELD_LENGTH = 1;

// Account number generation
/**
 * Minimum value for account number generation (10 digits starting with 1)
 */
export const ACCOUNT_NUMBER_MIN = 1000000000;

/**
 * Maximum value for account number generation (10 digits all 9s)
 */
export const ACCOUNT_NUMBER_MAX = 9999999999;

/**
 * Number of transactions to display in a single request
 */
export const TRANSACTIONS_LIMIT = 10;

export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/;
