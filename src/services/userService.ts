import { findUserById, findUserByEmail } from '../repositories/userRepository';
import { User } from '../types';

/**
 * Service for handling user-related operations
 */
const userService = {
  /**
   * Find a user by their ID
   * @param id - The user ID to search for
   * @returns The user if found, null otherwise
   */
  findUserById: async (id: string): Promise<User | null> => {
    return await findUserById(id);
  },

  /**
   * Find a user by their email address
   * @param email - The email address to search for
   * @returns The user if found, null otherwise
   */
  findUserByEmail: async (email: string): Promise<User | null> => {
    return await findUserByEmail(email);
  }
};

export default userService;
