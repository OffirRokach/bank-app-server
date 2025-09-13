import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import { signup, login } from "../controllers/authController";
import { mockRequest, mockResponse } from "./setup";
import {
  findUserByEmail,
  updateUserLastLoginAt,
} from "../repositories/userRepository";
import { getDefaultAccountByUserId } from "../repositories/accountRepository";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";
import { sendVerificationEmail } from "../utils/emailUtils";
import { HTTP_STATUS } from "../constants/httpStatusCodes";
import prisma from "../services/databaseService";
import jwt from "jsonwebtoken";

// Mock the repositories and utilities
const mockedFindUserByEmail = jest.mocked(findUserByEmail);
const mockedComparePasswords = jest.mocked(comparePasswords);
const mockedHashPassword = jest.mocked(hashPassword);
const mockedSendVerificationEmail = jest.mocked(sendVerificationEmail);

describe("Auth Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe("signup", () => {
    beforeEach(() => {
      req.body = {
        email: "new.user@example.com",
        password: "SecurePass123!",
        firstName: "New",
        lastName: "User",
        phoneNumber: "+1234567890",
        birthDate: "1990-01-01",
      };

      // Mock implementations
      mockedFindUserByEmail.mockResolvedValue(null);
      mockedHashPassword.mockResolvedValue("hashed-password");
      mockedSendVerificationEmail.mockResolvedValue(undefined);

      // Mock the prisma transaction implementation
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (callback: any) => await callback(prisma));

      jest
        .spyOn(prisma.user, "create")
        .mockResolvedValue({ id: "new-user-id" } as any);
    });

    test("should return error if password has no special character", async () => {
      req.body.password = "Password123";

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Password must contain"),
        })
      );
    });

    test("should return error if password is too short", async () => {
      req.body.password = "Pass1!";

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Password must be at least"),
        })
      );
    });

    test("should return error if password has many whitespaces", async () => {
      req.body.password = "Pass    123   !";

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });

    test("should return error if david.day@example.com already exists", async () => {
      // For this test, we'll use the actual findUserByEmail function
      // First, let's restore the original implementation
      mockedFindUserByEmail.mockRestore();

      // Create a user in the database first (if it doesn't exist)
      const existingUser = await prisma.user.findFirst({
        where: { email: "david.day@example.com" },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: "david-day-id",
            email: "david.day@example.com",
            firstName: "David",
            lastName: "Day",
            password: await hashPassword("SecurePass123!"),
            phoneNumber: "+1234567890",
            birthDate: new Date("1990-01-01"),
            status: "verified",
          },
        });
      }

      // Change the email to david.day@example.com
      req.body.email = "david.day@example.com";

      await signup(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email already registered",
        })
      );

      // Restore the mock for other tests
      jest.spyOn(findUserByEmail as any, "mockResolvedValue");
    });
  });

  describe("login", () => {
    beforeEach(() => {
      // Default login data
      req.body = {
        email: "david.day@example.com",
        password: "SecurePass123!",
      };

      // For these tests, we'll use the actual database functions
      // Restore original implementations
      mockedFindUserByEmail.mockRestore();
      mockedComparePasswords.mockRestore();

      // Make sure the user exists in the database
      // Create the user before running tests
      (async () => {
        try {
          const existingUser = await prisma.user.findFirst({
            where: { email: "david.day@example.com" },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                id: "david-day-id",
                email: "david.day@example.com",
                firstName: "David",
                lastName: "Day",
                password: await hashPassword("SecurePass123!"),
                phoneNumber: "+1234567890",
                birthDate: new Date("1990-01-01"),
                status: "verified",
              },
            });

            // Create a default account for this user
            await prisma.account.create({
              data: {
                id: "david-day-account-id",
                userId: "david-day-id",
                accountNumber: "123456789",
                balance: 1000,
                defaultAccount: true,
              },
            });
          }
        } catch (error) {
          console.error("Error setting up test user:", error);
        }
      })();
    });

    test("should login successfully with correct password SecurePass123!", async () => {
      req.body.password = "SecurePass123!";

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login successful",
        })
      );
    });

    test("should fail login with incorrect password MyPassword123!", async () => {
      req.body.password = "MyPassword123!";

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid credentials",
        })
      );
    });

    test("should return error if user not found", async () => {
      // Use a non-existent email
      req.body.email = "nonexistent@example.com";

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid credentials",
        })
      );
    });
  });

  // Verification tests removed
});
