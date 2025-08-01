import { PrismaClient } from "@prisma/client";
import { User } from "../types";
import { UserUpdatableFields } from "../types";

const prisma = new PrismaClient();

/**
 * Find a user by their email address
 * @param email - The email address to search for
 * @returns The user if found, null otherwise
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    return user as User;
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
};

/**
 * Find a user by their ID
 * @param id - The user ID to search for
 * @returns The user if found, null otherwise
 */
export const findUserById = async (id: string): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    return user as User;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
};

/**
 * Update a user's profile
 * @param id - The user ID to update
 * @param data - The data to update
 * @returns The updated user if successful, null otherwise
 */
export const updateUserProfile = async (
  id: string,
  data: UserUpdatableFields
): Promise<User> => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    return updatedUser as User;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/*
 * Update user last login at
 */
export const updateUserLastLoginAt = async (
  id: string,
  data: { lastLoginAt: Date }
) => {
  try {
    await prisma.user.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("Error updating user last login at:", error);
    throw error;
  }
};
