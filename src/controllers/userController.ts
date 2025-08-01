import { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatusCodes";
import {
  findUserById,
  updateUserProfile,
  findUserByEmail,
} from "../repositories/userRepository";
import { comparePasswords, hashPassword } from "../utils/passwordUtils";
import { UserProfile, UserUpdatableFields } from "../types";
import { mapUserToProfile } from "../utils/mappers";
import { JwtPayload } from "../types";
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MIN_REQUIRED_FIELD_LENGTH,
  NAME_REGEX,
  PHONE_REGEX,
  PASSWORD_REGEX,
} from "../constants/constants";
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if the user is trying to access their own profile
    if (!req.user || !req.user.userId || req.params.id !== req.user.userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: "You can only access your own profile",
      });
    }

    const user = await findUserById(req.params.id);

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const userProfile: UserProfile = mapUserToProfile(user);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "User profile retrieved successfully",
      data: userProfile,
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while retrieving user profile",
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/v1/users/:id
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  // Check if the user is trying to update their own profile
  if (!req.user || !req.user.userId || req.params.id !== req.user.userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "You can only update your own profile",
    });
  }

  const updateUserSchema = z.object({
    firstName: z
      .string()
      .min(MIN_REQUIRED_FIELD_LENGTH)
      .regex(NAME_REGEX, "Invalid first name")
      .optional(),
    lastName: z
      .string()
      .min(MIN_REQUIRED_FIELD_LENGTH)
      .regex(NAME_REGEX, "Invalid last name")
      .optional(),
    email: z.email("Invalid email address").optional(),
    phoneNumber: z
      .string()
      .min(MIN_REQUIRED_FIELD_LENGTH)
      .regex(PHONE_REGEX, "Invalid phone number")
      .optional(),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH)
      .regex(
        PASSWORD_REGEX,
        "Password must contain lowercase, uppercase, number, and special character"
      )
      .optional(),
    currentPassword: z.string().optional(),
  });

  const userId = req.params.id;
  const parseResult = updateUserSchema.safeParse(req.body);

  if (!parseResult.success) {
    // Get all validation issues
    const issues = parseResult.error.issues;
    const errorMessages: string[] = [];

    // Group issues by path for better error messages
    const groupedIssues: Record<string, string[]> = {};

    issues.forEach((issue) => {
      const path = issue.path.join(".") || "value";
      if (!groupedIssues[path]) {
        groupedIssues[path] = [];
      }
      groupedIssues[path].push(issue.message);
    });

    // Format error messages by field
    Object.entries(groupedIssues).forEach(([field, messages]) => {
      errorMessages.push(`${field}: ${messages.join(", ")}`);
    });

    const message =
      errorMessages.length > 0 ? errorMessages.join("; ") : "Validation failed";

    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ success: false, message });
  }

  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    newPassword,
    currentPassword,
  } = parseResult.data;

  const currentUser = await findUserById(userId);

  if (!currentUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: "User not found",
    });
  }

  const updateData: UserUpdatableFields = {};
  const updatedFields: Partial<Omit<UserUpdatableFields, "password">> = {};
  let isPasswordUpdated = false;
  let isEmailUpdated = false;

  // Explicitly add each field to updateData and updatedFields if defined
  if (firstName !== undefined) {
    updateData.firstName = firstName;
    updatedFields.firstName = firstName;
  }

  if (lastName !== undefined) {
    updateData.lastName = lastName;
    updatedFields.lastName = lastName;
  }

  // Handle email change with validation
  if (email !== undefined && email !== currentUser.email) {
    // Check if email is already in use by another user
    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: "Email is already in use by another account",
      });
    }

    updateData.email = email;
    updatedFields.email = email;
    isEmailUpdated = true;
  }

  if (phoneNumber !== undefined) {
    updateData.phoneNumber = phoneNumber;
    updatedFields.phoneNumber = phoneNumber;
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Current password is required to update password",
      });
    }

    const isPasswordValid = await comparePasswords(
      currentPassword,
      currentUser.password
    );

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    updateData.password = await hashPassword(newPassword);
    isPasswordUpdated = true;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: "No valid fields to update",
    });
  }

  await updateUserProfile(userId, updateData);

  // Determine appropriate success message based on what was updated
  let successMessage = "Profile updated successfully";
  if (
    isPasswordUpdated &&
    !isEmailUpdated &&
    Object.keys(updatedFields).length === 0
  ) {
    successMessage = "Password updated successfully";
  } else if (
    isEmailUpdated &&
    !isPasswordUpdated &&
    Object.keys(updatedFields).length === 1
  ) {
    successMessage = "Email updated successfully";
  } else if (isEmailUpdated && isPasswordUpdated) {
    successMessage = "Profile and credentials updated successfully";
  }

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: successMessage,
    data: Object.keys(updatedFields).length > 0 ? updatedFields : undefined,
  });
};
