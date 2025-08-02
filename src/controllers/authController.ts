import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import prisma from "../services/databaseService";
import {
  DEFAULT_FIRST_ACCOUNT_BALANCE,
  ACCESS_TOKEN_EXPIRES_IN,
  VERIFICATION_TOKEN_EXPIRES_IN,
  MIN_PASSWORD_LENGTH,
  MIN_REQUIRED_FIELD_LENGTH,
  NAME_REGEX,
  PHONE_REGEX,
  PASSWORD_REGEX,
} from "../constants/constants";
import { HTTP_STATUS } from "../constants/httpStatusCodes";

// Using direct user creation with email verification
import {
  AccessToken,
  LoginResponse,
  JwtPayload,
  AccountResponse,
  SignupResponse,
} from "../types";
import {
  findUserByEmail,
  updateUserLastLoginAt,
} from "../repositories/userRepository";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";
import { getDefaultAccountByUserId } from "../repositories/accountRepository";
import { sendVerificationEmail } from "../utils/emailUtils";
import { generateAccountNumber } from "../utils/accountUtils";
import { z } from "zod";
import validator from "validator";
import normalizeEmail from "normalize-email";

// Define interface to extend Express Request
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * User signup controller
 * Validates input, normalizes email, checks for existing user,
 * creates new user with default account, and sends verification email
 */
export const signup = async (req: Request, res: Response) => {
  try {
    // Define validation schema using zod
    const signupSchema = z.object({
      email: z.string(),
      password: z
        .string()
        .min(
          MIN_PASSWORD_LENGTH,
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        )
        .regex(
          PASSWORD_REGEX,
          "Password must contain at least one lowercase letter, one uppercase letter, one number and one special character"
        ),
      firstName: z
        .string()
        .min(MIN_REQUIRED_FIELD_LENGTH, "First name is required")
        .regex(NAME_REGEX, "Invalid first name"),
      lastName: z
        .string()
        .min(MIN_REQUIRED_FIELD_LENGTH, "Last name is required")
        .regex(NAME_REGEX, "Invalid last name"),
      phoneNumber: z
        .string()
        .min(MIN_REQUIRED_FIELD_LENGTH, "Phone number is required")
        .regex(PHONE_REGEX, "Invalid phone number"),
      birthDate: z
        .date()
        .or(z.string().transform((str) => new Date(str)))
        .refine((date) => !isNaN(date.getTime()), {
          message: "Invalid birth date format",
        }),
    });

    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedErrors = JSON.stringify(validationResult.error.format());
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        error: formattedErrors,
      });
    }

    const userData = validationResult.data;

    // Basic validation with validator
    if (!validator.isEmail(userData.email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Normalize email (handles Gmail dots, casing, aliases)
    const normalizedEmail = normalizeEmail(userData.email);

    // Check if user already exists
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create new user with hashed password
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: normalizedEmail,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        birthDate: new Date(userData.birthDate), // Ensure birthDate is a proper Date object for Prisma
        status: "pending", // User starts as pending until email is verified
      },
    });

    // Create default account for the user
    const accountNumber = generateAccountNumber();
    await prisma.account.create({
      data: {
        id: uuidv4(),
        accountNumber,
        defaultAccount: true,
        balance: DEFAULT_FIRST_ACCOUNT_BALANCE,
        userId: newUser.id,
        createdAt: new Date(),
      },
    });

    const payload = {
      userId: newUser.id,
      email: normalizedEmail,
      firstName: userData.firstName,
    } as JwtPayload;

    // Send verification email
    const verificationToken = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: VERIFICATION_TOKEN_EXPIRES_IN }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(normalizedEmail, verificationLink);

    // Return success response with user data (excluding password)
    const responseData: SignupResponse = {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phoneNumber: newUser.phoneNumber,
      birthDate: newUser.birthDate.toISOString(),
    };

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in signup:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while creating your account",
    });
  }
};

/**
 * Verify user account using JWT token from email
 */
export const verifyAccount = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Token is required",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
    } catch (error) {
      console.error("Error verifying token1:", token, error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Get user by email
    const user = await findUserByEmail(decoded.email as string);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already verified
    if (user.status === "verified") {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Email already verified. You can now log in.",
      });
    }

    // Update user status
    await prisma.$transaction(async (tx) => {
      // Update user status to verified
      await tx.user.update({
        where: { id: user.id },
        data: { status: "verified" },
      });
    });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error in verifyAccount:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while verifying your account",
    });
  }
};

/**
 * User login controller
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Normalize email (handles Gmail dots, casing, aliases)
    const normalizedEmail = normalizeEmail(email);

    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.status === "pending") {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Account is not verified",
      });
    }

    const isValid = await comparePasswords(password, user.password);
    if (!isValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
    } as JwtPayload;

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const accessToken: AccessToken = token;
    const defaultAccount: AccountResponse | null =
      await getDefaultAccountByUserId(user.id);

    // Check if default account exists
    if (!defaultAccount) {
      console.error(`No default account found for user ${user.id}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Account configuration error. Please contact support.",
      });
    }

    const loginResponse: LoginResponse = {
      authToken: accessToken,
      defaultAccount: defaultAccount,
    };

    const lastLoginAt = new Date();

    updateUserLastLoginAt(user.id, { lastLoginAt });

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Login successful",
      data: loginResponse,
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred during login",
    });
  }
};

/**
 * User logout controller
 *
 */
export const logout = async (req: AuthenticatedRequest, res: Response) => {};
